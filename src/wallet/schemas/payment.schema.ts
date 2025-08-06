import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Booking } from '../../bookings/schemas/booking.schema';

export type PaymentDocument = Payment & Document;

export enum PaymentProvider {
  FAPSHI = 'fapshi',
  MTN_MONEY = 'mtn_money',
  ORANGE_MONEY = 'orange_money',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PaymentType {
  BOOKING_PAYMENT = 'booking_payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
}

@Schema({ _id: false })
export class ProviderMetadata {
  @Prop()
  apiTransactionId?: string;

  @Prop()
  externalTransactionId?: string;

  @Prop()
  transactionToken?: string;

  @Prop()
  webhookUrl?: string;

  @Prop()
  callbackUrl?: string;

  @Prop()
  requestId?: string;

  @Prop({ type: Object })
  apiResponse?: any;

  @Prop({ type: Object })
  webhookData?: any;

  // Fapshi-specific fields
  @Prop()
  fapshiPaymentId?: string;

  @Prop()
  fapshiPaymentUrl?: string;

  @Prop()
  fapshiExternalId?: string;

  @Prop()
  fapshiTransactionId?: string;

  @Prop()
  fapshiPaymentMethod?: string;
}

@Schema({ _id: false })
export class PaymentDetails {
  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  accountName?: string;

  @Prop()
  operatorCode?: string; // For specific operator identification

  @Prop()
  country?: string;

  @Prop({ default: 'CM' })
  countryCode: string;
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  payerId: Types.ObjectId; // Usually the seeker making payment

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId; // Usually the provider receiving payment

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true })
  amount: number; // Amount in FCFA

  @Prop({ default: 'FCFA' })
  currency: string;

  @Prop({
    type: String,
    enum: PaymentProvider,
    required: true,
  })
  provider: PaymentProvider;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Prop({
    type: String,
    enum: PaymentType,
    default: PaymentType.BOOKING_PAYMENT,
  })
  paymentType: PaymentType;

  @Prop({ type: PaymentDetails, required: true })
  paymentDetails: PaymentDetails;

  @Prop({ type: ProviderMetadata, default: () => ({}) })
  providerMetadata: ProviderMetadata;

  @Prop({ required: true })
  paymentReference: string; // Our internal reference

  @Prop()
  description?: string;

  @Prop()
  failureReason?: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  expiredAt?: Date;

  @Prop()
  webhookReceivedAt?: Date;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 5 })
  maxRetries: number;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create indexes for efficient querying
PaymentSchema.index({ paymentReference: 1 }, { unique: true });
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ payerId: 1, createdAt: -1 });
PaymentSchema.index({ receiverId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ provider: 1, status: 1 });
PaymentSchema.index({ 'providerMetadata.apiTransactionId': 1 });
PaymentSchema.index({ 'providerMetadata.externalTransactionId': 1 });
PaymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Expire after 30 days for failed/cancelled payments
