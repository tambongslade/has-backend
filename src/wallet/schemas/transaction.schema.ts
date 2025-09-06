import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Session } from '../../bookings/schemas/session.schema';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  EARNING = 'earning',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  COMMISSION = 'commission',
  FEE = 'fee',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum WithdrawalMethod {
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  PAYPAL = 'paypal',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: TransactionType,
    required: true,
  })
  type: TransactionType;

  @Prop({ required: true })
  amount: number; // Amount in FCFA

  @Prop({ default: 'FCFA' })
  currency: string;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Session' })
  sessionId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: WithdrawalMethod,
  })
  withdrawalMethod?: WithdrawalMethod;

  @Prop({ type: Object })
  withdrawalDetails?: {
    // For Mobile Money
    phoneNumber?: string;
    accountName?: string;
    provider?: 'orange' | 'mtn' | 'other';
    // For Bank Transfer
    bankName?: string;
    accountNumber?: string;
    swiftCode?: string;
    // For PayPal
    email?: string;
  };

  @Prop()
  transactionReference?: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  failureReason?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Create indexes for efficient transaction queries
TransactionSchema.index({ providerId: 1, type: 1 });
TransactionSchema.index({ providerId: 1, status: 1 });
TransactionSchema.index({ providerId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ transactionReference: 1 });
TransactionSchema.index({ bookingId: 1 });
