import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole, ProviderStatus } from '../users/schemas/user.schema';
import { Service, ServiceDocument, ServiceCategory } from '../services/schemas/service.schema';
import { Session, SessionDocument, SessionStatus } from './schemas/session.schema';
import { AvailabilityService } from './availability.service';
import { ServiceRequestDto } from './dto/service-request.dto';
import { AvailableProvidersResponseDto, ServiceRequestInfoDto, AvailableProviderDto } from './dto/available-providers-response.dto';
import { SessionConfigService } from '../config/session-config.service';

export interface ServiceRequest {
  _id: string;
  seekerId: Types.ObjectId;
  category: ServiceCategory;
  serviceDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  province: string;
  specialInstructions?: string;
  description?: string;
  status: 'pending' | 'provider_selected' | 'completed' | 'cancelled';
  selectedProviderId?: Types.ObjectId;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private availabilityService: AvailabilityService,
    private sessionConfigService: SessionConfigService,
  ) {}

  async createServiceRequest(
    serviceRequestDto: ServiceRequestDto,
    seekerId: string,
  ): Promise<{ message: string; requestId: string; estimatedCost: number }> {
    // Calculate end time
    const endTime = this.calculateEndTime(
      serviceRequestDto.startTime,
      serviceRequestDto.duration,
    );

    // Calculate estimated cost
    const pricingInfo = await this.sessionConfigService.calculateSessionPrice(
      serviceRequestDto.category,
      serviceRequestDto.duration,
    );

    // Create a generic service for this category if it doesn't exist
    let genericService = await this.serviceModel.findOne({
      category: serviceRequestDto.category,
      providerId: { $exists: false }, // Generic service without provider
    });

    if (!genericService) {
      // Create a generic service template for this category
      genericService = new this.serviceModel({
        title: `${serviceRequestDto.category.charAt(0).toUpperCase() + serviceRequestDto.category.slice(1)} Service`,
        description: serviceRequestDto.description || `Professional ${serviceRequestDto.category} service`,
        category: serviceRequestDto.category,
        status: 'active',
        isAvailable: true,
      });
      await genericService.save();
    }

    // Create a session with PENDING_ASSIGNMENT status
    // This will appear in the admin dashboard for assignment
    const session = new this.sessionModel({
      seekerId: new Types.ObjectId(seekerId),
      serviceId: genericService._id,
      serviceName: genericService.title,
      category: serviceRequestDto.category,
      sessionDate: new Date(serviceRequestDto.serviceDate),
      startTime: serviceRequestDto.startTime,
      endTime,
      baseDuration: serviceRequestDto.duration,
      basePrice: pricingInfo.basePrice,
      totalAmount: pricingInfo.totalPrice,
      status: SessionStatus.PENDING_ASSIGNMENT,
      serviceLocation: serviceRequestDto.province,
      serviceAddress: serviceRequestDto.location.address,
      notes: serviceRequestDto.specialInstructions,
    });

    const savedSession = await session.save();

    return {
      message: 'Service request submitted successfully. An admin will assign a provider to your request.',
      requestId: (savedSession._id as Types.ObjectId).toString(),
      estimatedCost: pricingInfo.totalPrice,
    };
  }

  private async findAvailableProviders(
    serviceRequest: ServiceRequest,
  ): Promise<AvailableProviderDto[]> {
    // Find providers who offer services in this category and serve this province
    const providers = await this.userModel
      .find({
        role: UserRole.PROVIDER,
        'providerProfile.status': ProviderStatus.ACTIVE,
        'providerProfile.serviceCategories': serviceRequest.category,
        'providerProfile.serviceAreas': serviceRequest.province,
      })
      .select('fullName email phoneNumber providerProfile')
      .exec();

    const availableProviders: AvailableProviderDto[] = [];

    for (const provider of providers) {
      // Check if provider is available at the requested time
      const isAvailable = await this.availabilityService.isAvailable(
        (provider._id as Types.ObjectId).toString(),
        serviceRequest.serviceDate,
        serviceRequest.startTime,
        serviceRequest.endTime,
      );

      if (isAvailable) {
        // Check for conflicts with existing sessions
        const hasConflict = await this.checkProviderConflict(
          (provider._id as Types.ObjectId).toString(),
          serviceRequest.serviceDate,
          serviceRequest.startTime,
          serviceRequest.endTime,
        );

        if (!hasConflict) {
          // Calculate distance (simplified - in real app, use proper geolocation)
          const coordinates = provider.providerProfile?.currentLocation?.coordinates || [0, 0];
          const distance = this.calculateDistance(
            serviceRequest.location,
            [coordinates[0], coordinates[1]] as [number, number],
          );

          availableProviders.push({
            id: (provider._id as Types.ObjectId).toString(),
            fullName: provider.fullName,
            email: provider.email,
            phoneNumber: provider.phoneNumber,
            averageRating: provider.providerProfile?.averageRating || 0,
            totalReviews: provider.providerProfile?.totalReviews || 0,
            distance,
            bio: provider.providerProfile?.bio,
            serviceCategories: provider.providerProfile?.serviceCategories || [],
            isAvailable: true,
            lastActive: provider.providerProfile?.lastLocationUpdate,
          });
        }
      }
    }

    // Sort by rating and distance
    availableProviders.sort((a, b) => {
      const ratingDiff = b.averageRating - a.averageRating;
      if (ratingDiff !== 0) return ratingDiff;
      return a.distance - b.distance;
    });

    return availableProviders;
  }

  private async checkProviderConflict(
    providerId: string,
    serviceDate: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    const existingSession = await this.sessionModel
      .findOne({
        providerId: new Types.ObjectId(providerId),
        sessionDate: serviceDate,
        status: { $in: [SessionStatus.CONFIRMED, SessionStatus.IN_PROGRESS] },
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
        ],
      })
      .exec();

    return !!existingSession;
  }

  private calculateDistance(
    location1: { latitude: number; longitude: number },
    location2: [number, number], // [longitude, latitude]
  ): number {
    // Simplified distance calculation (Haversine formula would be better)
    const lat1 = location1.latitude;
    const lon1 = location1.longitude;
    const lat2 = location2[1];
    const lon2 = location2[0];

    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration * 60;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  async getUserServiceRequests(
    userId: string,
    status?: string,
    skip = 0,
    limit = 20,
  ) {
    // In a real implementation, this would query a ServiceRequest collection
    // For now, return sessions as a placeholder
    const query: any = { seekerId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('providerId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(query).exec(),
    ]);

    return {
      requests: sessions,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getServiceRequestStatus(requestId: string) {
    const session = await this.sessionModel
      .findById(requestId)
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    if (!session) {
      throw new NotFoundException('Service request not found');
    }

    return {
      requestId: (session._id as Types.ObjectId).toString(),
      status: session.status,
      category: session.category,
      serviceDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.baseDuration,
      totalAmount: session.totalAmount,
      serviceLocation: session.serviceLocation,
      serviceAddress: session.serviceAddress,
      notes: session.notes,
      seeker: session.seekerId,
      provider: session.providerId,
      assignedAt: session.assignedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
