import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LocationTracking,
  LocationTrackingDocument,
  LocationStatus,
} from './schemas/location-tracking.schema';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from './schemas/session.schema';
import { UserRole } from '../users/schemas/user.schema';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
}

export interface StartTrackingRequest {
  sessionId: string;
  serviceLatitude: number;
  serviceLongitude: number;
  providerLatitude: number;
  providerLongitude: number;
}

@Injectable()
export class LocationTrackingService {
  constructor(
    @InjectModel(LocationTracking.name)
    private locationTrackingModel: Model<LocationTrackingDocument>,
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
  ) {}

  // Start location tracking for a session
  async startTracking(
    request: StartTrackingRequest,
    userId: string,
    userRole: UserRole,
  ) {
    const session = await this.sessionModel.findById(request.sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only provider or admin can start tracking
    if (
      userRole !== UserRole.ADMIN &&
      (userRole !== UserRole.PROVIDER || session.providerId?.toString() !== userId)
    ) {
      throw new ForbiddenException(
        'Only assigned provider or admin can start tracking',
      );
    }

    if (session.status !== SessionStatus.CONFIRMED && session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Can only track confirmed or in-progress sessions',
      );
    }

    // Check if tracking already exists
    const existingTracking = await this.locationTrackingModel.findOne({
      sessionId: new Types.ObjectId(request.sessionId),
      isActive: true,
    });

    if (existingTracking) {
      throw new BadRequestException('Location tracking already active for this session');
    }

    // Create new tracking record
    const tracking = new this.locationTrackingModel({
      sessionId: new Types.ObjectId(request.sessionId),
      providerId: session.providerId,
      seekerId: session.seekerId,
      currentLocation: {
        type: 'Point',
        coordinates: [request.providerLongitude, request.providerLatitude],
      },
      serviceLocation: {
        type: 'Point',
        coordinates: [request.serviceLongitude, request.serviceLatitude],
      },
      status: LocationStatus.ON_ROUTE,
      isActive: true,
      distanceToDestination: this.calculateDistance(
        request.providerLatitude,
        request.providerLongitude,
        request.serviceLatitude,
        request.serviceLongitude,
      ),
    });

    const savedTracking = await tracking.save();

    // Update session status to IN_PROGRESS if not already
    if (session.status === SessionStatus.CONFIRMED) {
      await this.sessionModel.findByIdAndUpdate(request.sessionId, {
        status: SessionStatus.IN_PROGRESS,
      });
    }

    return this.formatTrackingResponse(savedTracking);
  }

  // Update provider's location
  async updateLocation(
    sessionId: string,
    locationUpdate: LocationUpdate,
    userId: string,
    userRole: UserRole,
  ) {
    const tracking = await this.locationTrackingModel
      .findOne({
        sessionId: new Types.ObjectId(sessionId),
        isActive: true,
      })
      .populate('sessionId');

    if (!tracking) {
      throw new NotFoundException('Active location tracking not found for this session');
    }

    // Only the assigned provider can update location
    if (
      userRole !== UserRole.ADMIN &&
      tracking.providerId.toString() !== userId
    ) {
      throw new ForbiddenException('Only assigned provider can update location');
    }

    // Update location
    const updatedTracking = await this.locationTrackingModel.findByIdAndUpdate(
      tracking._id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [locationUpdate.longitude, locationUpdate.latitude],
        },
        accuracy: locationUpdate.accuracy,
        speed: locationUpdate.speed,
        distanceToDestination: this.calculateDistance(
          locationUpdate.latitude,
          locationUpdate.longitude,
          tracking.serviceLocation.coordinates[1], // latitude
          tracking.serviceLocation.coordinates[0], // longitude
        ),
      },
      { new: true },
    );

    // Auto-update status based on proximity
    if (updatedTracking && tracking.status === LocationStatus.ON_ROUTE) {
      const distanceToService = updatedTracking.distanceToDestination || 0;
      
      // If within 100 meters of service location, mark as arrived
      if (distanceToService <= 100) {
        await this.markArrived(sessionId, userId, userRole);
      }
    }

    return this.formatTrackingResponse(updatedTracking!);
  }

  // Mark provider as arrived at service location
  async markArrived(sessionId: string, userId: string, userRole: UserRole) {
    const tracking = await this.locationTrackingModel.findOne({
      sessionId: new Types.ObjectId(sessionId),
      isActive: true,
    });

    if (!tracking) {
      throw new NotFoundException('Active location tracking not found');
    }

    if (
      userRole !== UserRole.ADMIN &&
      tracking.providerId.toString() !== userId
    ) {
      throw new ForbiddenException('Only assigned provider can mark arrival');
    }

    const updatedTracking = await this.locationTrackingModel.findByIdAndUpdate(
      tracking._id,
      {
        status: LocationStatus.AT_LOCATION,
        arrivedAt: new Date(),
      },
      { new: true },
    );

    return this.formatTrackingResponse(updatedTracking!);
  }

  // Mark service as started
  async markServiceStarted(sessionId: string, userId: string, userRole: UserRole) {
    const tracking = await this.locationTrackingModel.findOne({
      sessionId: new Types.ObjectId(sessionId),
      isActive: true,
    });

    if (!tracking) {
      throw new NotFoundException('Active location tracking not found');
    }

    if (
      userRole !== UserRole.ADMIN &&
      tracking.providerId.toString() !== userId
    ) {
      throw new ForbiddenException('Only assigned provider can start service');
    }

    const updatedTracking = await this.locationTrackingModel.findByIdAndUpdate(
      tracking._id,
      {
        serviceStartedAt: new Date(),
      },
      { new: true },
    );

    return this.formatTrackingResponse(updatedTracking!);
  }

  // Complete service and stop tracking
  async completeService(sessionId: string, userId: string, userRole: UserRole) {
    const tracking = await this.locationTrackingModel.findOne({
      sessionId: new Types.ObjectId(sessionId),
      isActive: true,
    });

    if (!tracking) {
      throw new NotFoundException('Active location tracking not found');
    }

    if (
      userRole !== UserRole.ADMIN &&
      tracking.providerId.toString() !== userId
    ) {
      throw new ForbiddenException('Only assigned provider can complete service');
    }

    const updatedTracking = await this.locationTrackingModel.findByIdAndUpdate(
      tracking._id,
      {
        status: LocationStatus.SERVICE_COMPLETE,
        serviceCompletedAt: new Date(),
        isActive: false,
      },
      { new: true },
    );

    // Update session status to completed
    await this.sessionModel.findByIdAndUpdate(sessionId, {
      status: SessionStatus.COMPLETED,
    });

    return this.formatTrackingResponse(updatedTracking!);
  }

  // Get current tracking info for seeker
  async getSeekerTracking(sessionId: string, userId: string) {
    const session = await this.sessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.seekerId.toString() !== userId) {
      throw new ForbiddenException('Can only view tracking for your own sessions');
    }

    const tracking = await this.locationTrackingModel
      .findOne({
        sessionId: new Types.ObjectId(sessionId),
        isActive: true,
      })
      .populate('providerId', 'fullName phoneNumber');

    if (!tracking) {
      return {
        sessionId,
        trackingActive: false,
        message: 'Location tracking not started yet',
      };
    }

    return this.formatSeekerTrackingResponse(tracking);
  }

  // Get provider's own tracking info
  async getProviderTracking(sessionId: string, userId: string) {
    const tracking = await this.locationTrackingModel
      .findOne({
        sessionId: new Types.ObjectId(sessionId),
        providerId: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate('sessionId');

    if (!tracking) {
      throw new NotFoundException('No active tracking found for this session');
    }

    return this.formatTrackingResponse(tracking);
  }

  // Stop tracking (emergency or cancellation)
  async stopTracking(sessionId: string, userId: string, userRole: UserRole) {
    const tracking = await this.locationTrackingModel.findOne({
      sessionId: new Types.ObjectId(sessionId),
      isActive: true,
    });

    if (!tracking) {
      throw new NotFoundException('No active tracking found');
    }

    // Only provider, seeker, or admin can stop tracking
    if (
      userRole !== UserRole.ADMIN &&
      tracking.providerId.toString() !== userId &&
      tracking.seekerId.toString() !== userId
    ) {
      throw new ForbiddenException('Unauthorized to stop tracking');
    }

    await this.locationTrackingModel.findByIdAndUpdate(tracking._id, {
      isActive: false,
    });

    return { message: 'Location tracking stopped' };
  }

  // Private helper methods
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private formatTrackingResponse(tracking: LocationTrackingDocument) {
    return {
      id: tracking._id,
      sessionId: tracking.sessionId,
      status: tracking.status,
      currentLocation: {
        latitude: tracking.currentLocation.coordinates[1],
        longitude: tracking.currentLocation.coordinates[0],
      },
      serviceLocation: {
        latitude: tracking.serviceLocation.coordinates[1],
        longitude: tracking.serviceLocation.coordinates[0],
      },
      distanceToDestination: tracking.distanceToDestination,
      speed: tracking.speed,
      accuracy: tracking.accuracy,
      estimatedArrivalTime: tracking.estimatedArrivalTime,
      arrivedAt: tracking.arrivedAt,
      serviceStartedAt: tracking.serviceStartedAt,
      serviceCompletedAt: tracking.serviceCompletedAt,
      isActive: tracking.isActive,
    };
  }

  private formatSeekerTrackingResponse(tracking: LocationTrackingDocument) {
    return {
      sessionId: tracking.sessionId,
      trackingActive: tracking.isActive,
      provider: tracking.providerId,
      status: tracking.status,
      providerLocation: {
        latitude: tracking.currentLocation.coordinates[1],
        longitude: tracking.currentLocation.coordinates[0],
      },
      serviceLocation: {
        latitude: tracking.serviceLocation.coordinates[1],
        longitude: tracking.serviceLocation.coordinates[0],
      },
      distanceToDestination: tracking.distanceToDestination,
      estimatedArrivalTime: tracking.estimatedArrivalTime,
      arrivedAt: tracking.arrivedAt,
      serviceStartedAt: tracking.serviceStartedAt,
      serviceCompletedAt: tracking.serviceCompletedAt,
    };
  }
}