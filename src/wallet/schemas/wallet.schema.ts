import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  providerId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  balance: number; // Available balance in FCFA

  @Prop({ required: true, default: 0 })
  pendingBalance: number; // Pending earnings from ongoing bookings

  @Prop({ required: true, default: 0 })
  totalEarnings: number; // Total lifetime earnings

  @Prop({ required: true, default: 0 })
  totalWithdrawn: number; // Total amount withdrawn

  @Prop({ default: 'FCFA' })
  currency: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
