import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WithdrawalMethod } from './transaction.schema';

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  swiftCode?: string;
}

export interface MobileMoneyDetails {
  phoneNumber: string;
  accountName: string;
  provider: 'orange' | 'mtn' | 'other';
}

export interface PaypalDetails {
  email: string;
  accountName: string;
}

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  withdrawalFee: number;

  @Prop({ required: true })
  netAmount: number;

  @Prop({
    type: String,
    enum: WithdrawalMethod,
    required: true,
  })
  withdrawalMethod: WithdrawalMethod;

  @Prop({
    type: String,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Prop({ type: Object })
  paymentDetails: BankDetails | MobileMoneyDetails | PaypalDetails;

  @Prop()
  notes?: string;

  @Prop()
  adminNotes?: string;

  @Prop()
  transactionReference?: string;

  @Prop()
  estimatedProcessingTime?: string;

  @Prop()
  processedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;

  @Prop()
  failureReason?: string;
}

export const WithdrawalRequestSchema =
  SchemaFactory.createForClass(WithdrawalRequest);

// Create indexes for efficient withdrawal queries by provider and status
WithdrawalRequestSchema.index({ providerId: 1, status: 1 });
WithdrawalRequestSchema.index({ providerId: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ transactionReference: 1 });
