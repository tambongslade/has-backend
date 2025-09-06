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

  // Pricing is handled by category-based SessionConfig system
  // Services are now generic templates, not provider-specific

  @Prop({ type: [String], default: [] })
  images: string[]; // Default category images

  @Prop({ type: [String], default: [] })
  tags: string[]; // Service tags for better searchability

  @Prop({
    type: String,
    enum: ServiceStatus,
    default: ServiceStatus.ACTIVE,
  })
  status: ServiceStatus;

  @Prop({ default: true })
  isAvailable: boolean; // Admin can disable service categories

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  providerId?: Types.ObjectId;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  // Requirements and expectations for this service type
  @Prop()
  requirements?: string; // What seekers should prepare

  @Prop()
  expectedDuration?: string; // Typical duration description

  @Prop()
  whatIsIncluded?: string; // What the service typically includes
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
