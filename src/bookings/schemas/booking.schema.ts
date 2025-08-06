import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import {
  Service,
  CameroonProvince,
} from '../../services/schemas/service.schema';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
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
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop()
  serviceName?: string; // Cache service name for performance

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seekerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ required: true })
  bookingDate: Date;

  @Prop({ required: true })
  startTime: string; // Format: "HH:mm" (e.g., "09:00")

  @Prop({ required: true })
  endTime: string; // Format: "HH:mm" (e.g., "17:00")

  @Prop({ required: true })
  duration: number; // Duration in hours

  @Prop({ required: true })
  totalAmount: number; // Total cost in FCFA

  @Prop({ default: 'FCFA' })
  currency: string;

  @Prop({
    type: String,
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop()
  specialInstructions?: string;

  @Prop({
    type: String,
    enum: CameroonProvince,
    required: true,
  })
  serviceLocation: CameroonProvince;

  @Prop()
  cancellationReason?: string;

  @Prop()
  providerNotes?: string;

  @Prop()
  seekerRating?: number; // Rating given by seeker (1-5)

  @Prop()
  providerRating?: number; // Rating given by provider (1-5)

  @Prop()
  seekerReview?: string;

  @Prop()
  providerReview?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
