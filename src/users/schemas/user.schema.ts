import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ServiceCategory, CameroonProvince } from '../../services/schemas/service.schema';

export type UserDocument = User & Document;

export enum UserRole {
  SEEKER = 'seeker',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

export enum ProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_APPROVAL = 'pending_approval',
}

@Schema()
export class ProviderProfile {
  // Service capabilities
  @Prop({ 
    type: [String], 
    enum: ServiceCategory, 
    default: [] 
  })
  serviceCategories: ServiceCategory[]; // What services they can provide

  @Prop({ 
    type: [String], 
    enum: CameroonProvince, 
    default: [] 
  })
  serviceAreas: CameroonProvince[]; // Areas they serve

  @Prop()
  serviceRadius: number; // How far they travel (in km)

  @Prop({
    type: String,
    enum: ExperienceLevel,
    default: ExperienceLevel.BEGINNER,
  })
  experienceLevel: ExperienceLevel;

  @Prop({ type: [String], default: [] })
  certifications: string[]; // Professional certifications

  @Prop({ type: [String], default: [] })
  portfolio: string[]; // Images of previous work

  @Prop()
  bio?: string; // Provider description

  // Performance metrics
  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalCompletedJobs: number;

  @Prop({ default: 0 })
  totalReviews: number;

  // Status and approval
  @Prop({
    type: String,
    enum: ProviderStatus,
    default: ProviderStatus.PENDING_APPROVAL,
  })
  status: ProviderStatus;

  @Prop()
  approvedAt?: Date;

  @Prop()
  approvedBy?: string; // Admin ID who approved

  // Current location for tracking (will be updated in real-time)
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  })
  currentLocation?: {
    type: string;
    coordinates: number[];
  };

  @Prop()
  lastLocationUpdate?: Date;

  @Prop({ default: false })
  isOnDuty: boolean; // Currently working on a job
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phoneNumber?: string;

  @Prop({
    type: String,
    enum: UserRole,
    required: false,
    default: null,
  })
  role?: UserRole | null;

  @Prop({ default: true })
  isActive: boolean;

  // Provider-specific profile (only populated if role is PROVIDER)
  @Prop({ type: ProviderProfile, default: null })
  providerProfile?: ProviderProfile;

  // Additional user location for seekers
  @Prop({
    type: String,
    enum: CameroonProvince,
  })
  location?: CameroonProvince;
}

export const UserSchema = SchemaFactory.createForClass(User);
export const ProviderProfileSchema = SchemaFactory.createForClass(ProviderProfile);

// Index for geospatial queries (provider location tracking)
UserSchema.index({ 'providerProfile.currentLocation': '2dsphere' });
