import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ServiceCategory,
  CameroonProvince,
} from '../../services/schemas/service.schema';

export type SessionDocument = Session &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export enum SessionStatus {
  PENDING_ASSIGNMENT = 'pending_assignment', // Seeker created, waiting for admin assignment
  ASSIGNED = 'assigned', // Admin assigned provider, waiting for confirmation
  CONFIRMED = 'confirmed', // Provider confirmed or auto-confirmed by admin
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected', // Provider can still reject after assignment
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

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  providerId?: Types.ObjectId; // Now optional - assigned by admin later

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
    default: SessionStatus.PENDING_ASSIGNMENT,
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

  // Admin assignment tracking
  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy?: Types.ObjectId; // Admin who made the assignment

  @Prop()
  assignedAt?: Date; // When provider was assigned

  @Prop()
  assignmentNotes?: string; // Admin notes about the assignment

  // Rejection tracking (if admin rejects the request)
  @Prop()
  rejectionReason?: string; // Reason for rejection

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId; // Admin who rejected the request

  @Prop()
  rejectedAt?: Date; // When request was rejected

  // Location for service (seeker's location)
  @Prop({
    type: String,
    enum: CameroonProvince,
    required: true,
  })
  serviceLocation: CameroonProvince;

  @Prop()
  serviceAddress?: string; // Specific address within the province

  @Prop()
  serviceLatitude?: number; // GPS latitude coordinate

  @Prop()
  serviceLongitude?: number; // GPS longitude coordinate

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
