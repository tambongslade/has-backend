import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Session,
  SessionDocument,
  SessionStatus,
  PaymentStatus,
} from './schemas/session.schema';
import { Service, ServiceDocument } from '../services/schemas/service.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { SessionConfigService } from '../config/session-config.service';
import { AvailabilityService } from './availability.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class SessionsService {
  private walletService: any; // Will be injected later to avoid circular dependency

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    private sessionConfigService: SessionConfigService,
    private availabilityService: AvailabilityService,
  ) {}

  // Method to set wallet service (called from wallet module)
  setWalletService(walletService: any) {
    this.walletService = walletService;
  }

  async createSession(
    createSessionDto: CreateSessionDto,
    seekerId: string,
  ): Promise<SessionResponseDto> {
    // Get service details
    const service = await this.serviceModel
      .findById(createSessionDto.serviceId)
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.isAvailable) {
      throw new ConflictException(
        'Service is currently not available for booking',
      );
    }

    // Calculate session pricing
    const pricingInfo = await this.sessionConfigService.calculateSessionPrice(
      service.category,
      createSessionDto.duration,
    );

    // Calculate end time
    const startTime = createSessionDto.startTime;
    const endTime = this.calculateEndTime(startTime, createSessionDto.duration);

    // Check provider availability
    const isProviderAvailable = await this.availabilityService.isAvailable(
      service.providerId.toString(),
      new Date(createSessionDto.sessionDate),
      startTime,
      endTime,
    );

    if (!isProviderAvailable) {
      throw new ConflictException(
        'Provider is not available at the requested time',
      );
    }

    // Check for conflicts with existing sessions
    const hasConflict = await this.checkSessionConflict(
      service.providerId.toString(),
      new Date(createSessionDto.sessionDate),
      startTime,
      endTime,
    );

    if (hasConflict) {
      throw new ConflictException(
        'Provider already has a session at the requested time',
      );
    }

    // Create session
    const session = new this.sessionModel({
      seekerId,
      providerId: service.providerId,
      serviceId: service._id,
      serviceName: service.title,
      category: service.category,
      sessionDate: new Date(createSessionDto.sessionDate),
      startTime,
      endTime,
      baseDuration: pricingInfo.baseDuration,
      overtimeHours: pricingInfo.overtimeHours,
      basePrice: pricingInfo.basePrice,
      overtimePrice: pricingInfo.overtimePrice,
      totalAmount: pricingInfo.totalPrice,
      currency: 'FCFA',
      notes: createSessionDto.notes,
    });

    const savedSession = await session.save();
    return this.mapToResponseDto(savedSession);
  }

  async findAll(
    filter: any = {},
    skip = 0,
    limit = 20,
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionModel
      .find(filter)
      .populate('serviceId', 'title category images')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return sessions.map((session) => this.mapToResponseDto(session));
  }

  async findBySeeker(seekerId: string, status?: string, skip = 0, limit = 20) {
    const query: any = { seekerId };
    if (status) {
      query.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('serviceId', 'title category images')
        .populate('providerId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(query).exec(),
    ]);

    return {
      sessions: sessions.map((session) => this.mapToResponseDto(session)),
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: await this.getSessionStatusSummary(seekerId, 'seeker'),
    };
  }

  async findByProvider(
    providerId: string,
    status?: string,
    skip = 0,
    limit = 20,
  ) {
    const query: any = { providerId };
    if (status) {
      query.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('serviceId', 'title category images')
        .populate('seekerId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(query).exec(),
    ]);

    return {
      sessions: sessions.map((session) => this.mapToResponseDto(session)),
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: await this.getSessionStatusSummary(providerId, 'provider'),
    };
  }

  async findOne(id: string): Promise<SessionResponseDto> {
    const session = await this.sessionModel
      .findById(id)
      .populate('serviceId', 'title category description images')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapToResponseDto(session);
  }

  async updateSession(
    id: string,
    updateSessionDto: UpdateSessionDto,
    userId: string,
    userRole: UserRole,
  ): Promise<SessionResponseDto> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if user has permission to update this session
    const canUpdate =
      session.seekerId.toString() === userId ||
      session.providerId.toString() === userId ||
      userRole === UserRole.PROVIDER; // Assuming admins can update any session

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this session',
      );
    }

    // If updating time or date, recalculate pricing and check availability
    if (
      updateSessionDto.sessionDate ||
      updateSessionDto.startTime ||
      updateSessionDto.duration
    ) {
      const sessionDate = updateSessionDto.sessionDate
        ? new Date(updateSessionDto.sessionDate)
        : session.sessionDate;
      const startTime = updateSessionDto.startTime || session.startTime;
      const duration =
        updateSessionDto.duration ||
        session.baseDuration + session.overtimeHours;

      const endTime = this.calculateEndTime(startTime, duration);

      // Check for conflicts (excluding current session)
      const hasConflict = await this.checkSessionConflict(
        session.providerId.toString(),
        sessionDate,
        startTime,
        endTime,
        id,
      );

      if (hasConflict) {
        throw new ConflictException(
          'Provider already has a session at the requested time',
        );
      }

      // Recalculate pricing if duration changed
      if (updateSessionDto.duration) {
        const service = await this.serviceModel.findById(session.serviceId);
        if (service) {
          const pricingInfo =
            await this.sessionConfigService.calculateSessionPrice(
              service.category,
              updateSessionDto.duration,
            );

          updateSessionDto = {
            ...updateSessionDto,
            endTime,
            baseDuration: pricingInfo.baseDuration,
            overtimeHours: pricingInfo.overtimeHours,
            basePrice: pricingInfo.basePrice,
            overtimePrice: pricingInfo.overtimePrice,
            totalAmount: pricingInfo.totalPrice,
          } as any;
        }
      }
    }

    const updatedSession = await this.sessionModel
      .findByIdAndUpdate(id, updateSessionDto, { new: true })
      .populate('serviceId', 'title category description images')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    // If session is being marked as completed, process the earning
    if (
      updateSessionDto.status === SessionStatus.COMPLETED &&
      session.status !== SessionStatus.COMPLETED &&
      this.walletService
    ) {
      try {
        await this.walletService.processEarning(
          session.providerId.toString(),
          id,
          session.totalAmount,
        );
      } catch (error) {
        console.error('Error processing earning:', error);
        // Don't fail the session update if wallet processing fails
      }
    }

    return this.mapToResponseDto(updatedSession!);
  }

  async cancelSession(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<SessionResponseDto> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only seeker or provider can cancel
    if (
      session.seekerId.toString() !== userId &&
      session.providerId.toString() !== userId
    ) {
      throw new ForbiddenException('You can only cancel your own sessions');
    }

    // Cannot cancel completed sessions
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed sessions');
    }

    return this.updateSession(
      id,
      {
        status: SessionStatus.CANCELLED,
        cancellationReason: reason,
      },
      userId,
      UserRole.SEEKER,
    );
  }

  private async checkSessionConflict(
    providerId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeSessionId?: string,
  ): Promise<boolean> {
    const query: any = {
      providerId,
      sessionDate: date,
      status: {
        $in: [
          SessionStatus.PENDING,
          SessionStatus.CONFIRMED,
          SessionStatus.IN_PROGRESS,
        ],
      },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    };

    if (excludeSessionId) {
      query._id = { $ne: excludeSessionId };
    }

    const conflictingSession = await this.sessionModel.findOne(query);
    return !!conflictingSession;
  }

  private calculateEndTime(startTime: string, durationHours: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + Math.round(durationHours * 60);

    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }

  private mapToResponseDto(session: SessionDocument): SessionResponseDto {
    return {
      id: (session._id as any).toString(),
      seekerId: session.seekerId.toString(),
      providerId: session.providerId.toString(),
      serviceId: session.serviceId.toString(),
      serviceName: session.serviceName,
      category: session.category,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      baseDuration: session.baseDuration,
      overtimeHours: session.overtimeHours,
      basePrice: session.basePrice,
      overtimePrice: session.overtimePrice,
      totalAmount: session.totalAmount,
      currency: session.currency,
      status: session.status,
      paymentStatus: session.paymentStatus,
      notes: session.notes,
      cancellationReason: session.cancellationReason,
      seekerRating: session.seekerRating,
      seekerReview: session.seekerReview,
      providerRating: session.providerRating,
      providerReview: session.providerReview,
      createdAt: (session as any).createdAt,
      updatedAt: (session as any).updatedAt,
    };
  }

  private async getSessionStatusSummary(
    userId: string,
    userType: 'seeker' | 'provider',
  ) {
    const userField = userType === 'seeker' ? 'seekerId' : 'providerId';

    const statusCounts = await this.sessionModel.aggregate([
      { $match: { [userField]: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const summary = {
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      totalEarnings: 0,
    };

    statusCounts.forEach(({ _id, count, totalAmount }) => {
      switch (_id) {
        case SessionStatus.PENDING:
          summary.pending = count;
          break;
        case SessionStatus.CONFIRMED:
          summary.confirmed = count;
          break;
        case SessionStatus.IN_PROGRESS:
          summary.inProgress = count;
          break;
        case SessionStatus.COMPLETED:
          summary.completed = count;
          if (userType === 'provider') {
            summary.totalEarnings += totalAmount;
          }
          break;
        case SessionStatus.CANCELLED:
          summary.cancelled = count;
          break;
        case SessionStatus.REJECTED:
          summary.rejected = count;
          break;
      }
    });

    return summary;
  }
}
