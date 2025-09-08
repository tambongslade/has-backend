import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../bookings/schemas/session.schema';
import {
  User,
  UserDocument,
  UserRole,
  ProviderStatus,
} from '../users/schemas/user.schema';
import {
  ServiceCategory,
  CameroonProvince,
} from '../services/schemas/service.schema';
import { AvailabilityService } from '../bookings/availability.service';
import {
  RejectAssignmentDto,
  RejectAssignmentResponseDto,
} from './dto/reject-assignment.dto';

export interface ProviderFilterOptions {
  category?: ServiceCategory;
  location?: CameroonProvince;
  maxDistance?: number; // in km
  minRating?: number;
  experienceLevel?: string;
  isAvailable?: boolean;
}

export interface AssignmentRequest {
  sessionId: string;
  providerId: string;
  notes?: string;
}

export interface AvailableProvider {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profile?: any;
  distance: number;
}

export interface AvailableProvidersResponse {
  session: {
    id: any;
    serviceName: string;
    category: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    serviceLocation: string;
    seeker: any;
  };
  providers: AvailableProvider[];
  totalFound: number;
}

@Injectable()
export class AdminAssignmentService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private availabilityService: AvailabilityService,
  ) {}

  // Get all pending sessions awaiting assignment
  async getPendingAssignments(skip = 0, limit = 20) {
    const query = {
      status: SessionStatus.PENDING_ASSIGNMENT,
    };

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('seekerId', 'fullName email phoneNumber location')
        .populate('serviceId', 'title category description')
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(query).exec(),
    ]);

    return {
      sessions,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Find available providers based on session requirements and filters
  async findAvailableProviders(
    sessionId: string,
    filters: ProviderFilterOptions = {},
  ): Promise<AvailableProvidersResponse> {
    const session = await this.sessionModel
      .findById(sessionId)
      .populate('serviceId')
      .exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.PENDING_ASSIGNMENT) {
      throw new BadRequestException('Session is not pending assignment');
    }

    // Build provider query
    const providerQuery: any = {
      role: UserRole.PROVIDER,
      isActive: true,
      'providerProfile.status': ProviderStatus.ACTIVE,
      'providerProfile.serviceCategories': session.category,
      'providerProfile.serviceAreas': session.serviceLocation,
    };

    // Apply filters
    if (filters.minRating) {
      providerQuery['providerProfile.averageRating'] = {
        $gte: filters.minRating,
      };
    }

    if (filters.experienceLevel) {
      providerQuery['providerProfile.experienceLevel'] =
        filters.experienceLevel;
    }

    // Find providers
    const providers = await this.userModel
      .find(providerQuery)
      .select('fullName email phoneNumber providerProfile')
      .exec();

    // Check availability for each provider
    const availableProviders: AvailableProvider[] = [];

    for (const provider of providers) {
      const providerId = (provider._id as any).toString();
      const isAvailable = await this.availabilityService.isAvailable(
        providerId,
        session.sessionDate,
        session.startTime,
        session.endTime,
      );

      if (isAvailable) {
        // Check for conflicts with existing sessions
        const hasConflict = await this.checkProviderConflict(
          providerId,
          session.sessionDate,
          session.startTime,
          session.endTime,
        );

        if (!hasConflict) {
          availableProviders.push({
            id: providerId,
            fullName: provider.fullName,
            email: provider.email,
            phoneNumber: provider.phoneNumber,
            profile: provider.providerProfile,
            // Add distance calculation if we have coordinates
            distance: this.calculateDistance(session, provider),
          });
        }
      }
    }

    // Sort by rating and distance
    availableProviders.sort((a, b) => {
      const ratingDiff =
        (b.profile?.averageRating || 0) - (a.profile?.averageRating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (a.distance || 0) - (b.distance || 0);
    });

    return {
      session: {
        id: session._id,
        serviceName: session.serviceName,
        category: session.category,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        serviceLocation: session.serviceLocation,
        seeker: session.seekerId,
      },
      providers: availableProviders,
      totalFound: availableProviders.length,
    };
  }

  // Assign a provider to a session
  async assignProvider(assignmentRequest: AssignmentRequest, adminId: string) {
    const { sessionId, providerId, notes } = assignmentRequest;

    // Validate session
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.PENDING_ASSIGNMENT) {
      throw new BadRequestException('Session is not pending assignment');
    }

    // Validate provider
    const provider = await this.userModel.findById(providerId);
    if (!provider || provider.role !== UserRole.PROVIDER) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.providerProfile?.status !== ProviderStatus.ACTIVE) {
      throw new BadRequestException('Provider is not active');
    }

    // Check if provider can handle this service category
    if (
      !provider.providerProfile?.serviceCategories?.includes(session.category)
    ) {
      throw new BadRequestException(
        'Provider does not offer this service category',
      );
    }

    // Check if provider serves this location
    if (
      !provider.providerProfile?.serviceAreas?.includes(session.serviceLocation)
    ) {
      throw new BadRequestException(
        'Provider does not serve this service area',
      );
    }

    // Double-check availability
    const isAvailable = await this.availabilityService.isAvailable(
      providerId,
      session.sessionDate,
      session.startTime,
      session.endTime,
    );

    if (!isAvailable) {
      throw new ConflictException('Provider is not available at this time');
    }

    // Check for conflicts
    const hasConflict = await this.checkProviderConflict(
      providerId,
      session.sessionDate,
      session.startTime,
      session.endTime,
    );

    if (hasConflict) {
      throw new ConflictException(
        'Provider already has a session at the requested time',
      );
    }

    // Assign provider
    const updatedSession = await this.sessionModel
      .findByIdAndUpdate(
        sessionId,
        {
          providerId: new Types.ObjectId(providerId),
          status: SessionStatus.ASSIGNED,
          assignedBy: new Types.ObjectId(adminId),
          assignedAt: new Date(),
          assignmentNotes: notes,
        },
        { new: true },
      )
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .populate('serviceId', 'title category description')
      .exec();

    return updatedSession;
  }

  // Reject a service request
  async rejectServiceRequest(
    sessionId: string,
    rejectAssignmentDto: RejectAssignmentDto,
    adminId: string,
  ): Promise<RejectAssignmentResponseDto> {
    // Validate session
    const session = await this.sessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.PENDING_ASSIGNMENT) {
      throw new BadRequestException(
        'Session is not pending assignment. Cannot reject sessions that are already assigned or processed.',
      );
    }

    // Update session with rejection details
    const rejectedSession = await this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: SessionStatus.REJECTED,
        rejectionReason: rejectAssignmentDto.reason,
        rejectedBy: new Types.ObjectId(adminId),
        rejectedAt: new Date(),
        assignmentNotes: rejectAssignmentDto.adminNotes,
      },
      { new: true },
    );

    return {
      message: 'Service request rejected successfully',
      sessionId: sessionId,
      status: rejectedSession!.status,
      rejectionReason: rejectedSession!.rejectionReason!,
      adminNotes: rejectedSession!.assignmentNotes,
      rejectedAt: rejectedSession!.rejectedAt!,
      rejectedBy: adminId,
    };
  }

  // Get assignment statistics
  async getAssignmentStats() {
    const stats = await this.sessionModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      pendingAssignment: 0,
      assigned: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    stats.forEach(({ _id, count }) => {
      switch (_id) {
        case SessionStatus.PENDING_ASSIGNMENT:
          statusCounts.pendingAssignment = count;
          break;
        case SessionStatus.ASSIGNED:
          statusCounts.assigned = count;
          break;
        case SessionStatus.CONFIRMED:
          statusCounts.confirmed = count;
          break;
        case SessionStatus.IN_PROGRESS:
          statusCounts.inProgress = count;
          break;
        case SessionStatus.COMPLETED:
          statusCounts.completed = count;
          break;
        case SessionStatus.CANCELLED:
          statusCounts.cancelled = count;
          break;
        case SessionStatus.REJECTED:
          statusCounts.rejected = count;
          break;
      }
    });

    return statusCounts;
  }

  // Private helper methods
  private async checkProviderConflict(
    providerId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    const conflictingSession = await this.sessionModel.findOne({
      providerId: new Types.ObjectId(providerId),
      sessionDate: date,
      status: {
        $in: [
          SessionStatus.ASSIGNED,
          SessionStatus.CONFIRMED,
          SessionStatus.IN_PROGRESS,
        ],
      },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    return !!conflictingSession;
  }

  private calculateDistance(session: any, provider: any): number {
    // For now, return 0 - in the future, calculate actual distance
    // using coordinates when available
    return 0;
  }
}
