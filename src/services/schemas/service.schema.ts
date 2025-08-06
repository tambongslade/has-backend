import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ServiceDocument = Service & Document;

export enum ServiceCategory {
  CLEANING = 'cleaning',
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  PAINTING = 'painting',
  GARDENING = 'gardening',
  CARPENTRY = 'carpentry',
  COOKING = 'cooking',
  TUTORING = 'tutoring',
  BEAUTY = 'beauty',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum CameroonProvince {
  CENTRE = 'Centre',
  LITTORAL = 'Littoral',
  WEST = 'West',
  NORTHWEST = 'Northwest',
  SOUTHWEST = 'Southwest',
  SOUTH = 'South',
  EAST = 'East',
  NORTH = 'North',
  ADAMAWA = 'Adamawa',
  FAR_NORTH = 'Far North',
}

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: ServiceCategory,
    required: true,
  })
  category: ServiceCategory;

  // Pricing is now handled by category-based system
  // No provider-set pricing allowed

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({
    type: String,
    enum: CameroonProvince,
    required: true,
  })
  location: CameroonProvince;

  @Prop({
    type: String,
    enum: ServiceStatus,
    default: ServiceStatus.ACTIVE,
  })
  status: ServiceStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  isAvailable: boolean;

  // Session-based booking - no hourly minimums/maximums
  // All bookings are session-based with overtime billing
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
