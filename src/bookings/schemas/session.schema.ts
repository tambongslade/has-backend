import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ServiceCategory } from '../../services/schemas/service.schema';

export type SessionDocument = Session &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export enum SessionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seekerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ required: true })
  serviceName: string; // Cached service name

  @Prop({
    type: String,
    enum: ServiceCategory,
    required: true,
  })
  category: ServiceCategory;

  @Prop({ required: true })
  sessionDate: Date;

  @Prop({ required: true })
  startTime: string; // Format: "HH:mm"

  @Prop({ required: true })
  endTime: string; // Format: "HH:mm"

  @Prop({ required: true })
  baseDuration: number; // Base session duration in hours

  @Prop({ default: 0 })
  overtimeHours: number; // Additional hours beyond base duration

  @Prop({ required: true })
  basePrice: number; // Base session price in FCFA

  @Prop({ default: 0 })
  overtimePrice: number; // Additional price for overtime in FCFA

  @Prop({ required: true })
  totalAmount: number; // Total price (base + overtime) in FCFA

  @Prop({ default: 'FCFA' })
  currency: string;

  @Prop({
    type: String,
    enum: SessionStatus,
    default: SessionStatus.PENDING,
  })
  status: SessionStatus;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop()
  notes?: string;

  @Prop()
  cancellationReason?: string;

  // Review system
  @Prop({ min: 1, max: 5 })
  seekerRating?: number;

  @Prop()
  seekerReview?: string;

  @Prop({ min: 1, max: 5 })
  providerRating?: number;

  @Prop()
  providerReview?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Create indexes for efficient queries
SessionSchema.index({ seekerId: 1, status: 1 });
SessionSchema.index({ providerId: 1, status: 1 });
SessionSchema.index({ sessionDate: 1, providerId: 1 });
SessionSchema.index({ status: 1, paymentStatus: 1 });
