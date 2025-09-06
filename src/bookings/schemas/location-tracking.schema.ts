import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LocationTrackingDocument = LocationTracking & Document;

export enum LocationStatus {
  ON_ROUTE = 'on_route', // Provider heading to service location
  AT_LOCATION = 'at_location', // Provider has arrived at service location
  SERVICE_COMPLETE = 'service_complete', // Provider has completed service
}

@Schema({ timestamps: true })
export class LocationTracking {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seekerId: Types.ObjectId;

  // Provider's current location
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  })
  currentLocation: {
    type: string;
    coordinates: number[];
  };

  // Service destination location
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  })
  serviceLocation: {
    type: string;
    coordinates: number[];
  };

  @Prop({
    type: String,
    enum: LocationStatus,
    default: LocationStatus.ON_ROUTE,
  })
  status: LocationStatus;

  @Prop()
  estimatedArrivalTime?: Date;

  @Prop()
  arrivedAt?: Date; // When provider arrived at service location

  @Prop()
  serviceStartedAt?: Date; // When service actually started

  @Prop()
  serviceCompletedAt?: Date; // When service was completed

  @Prop({ default: true })
  isActive: boolean; // Track if location sharing is still active

  // Additional tracking info
  @Prop()
  distanceToDestination?: number; // In meters

  @Prop()
  speed?: number; // Current speed in m/s

  @Prop()
  accuracy?: number; // GPS accuracy in meters
}

export const LocationTrackingSchema = SchemaFactory.createForClass(LocationTracking);

// Create geospatial indexes
LocationTrackingSchema.index({ currentLocation: '2dsphere' });
LocationTrackingSchema.index({ serviceLocation: '2dsphere' });

// Create compound indexes for efficient queries
LocationTrackingSchema.index({ sessionId: 1, isActive: 1 });
LocationTrackingSchema.index({ providerId: 1, status: 1 });
LocationTrackingSchema.index({ seekerId: 1, isActive: 1 });