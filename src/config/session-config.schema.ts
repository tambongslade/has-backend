import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ServiceCategory } from '../services/schemas/service.schema';

export type SessionConfigDocument = SessionConfig &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema()
export class CategoryPricing {
  @Prop({
    type: String,
    enum: ServiceCategory,
    required: true,
  })
  category: ServiceCategory;

  @Prop({ required: true })
  baseSessionPrice: number; // Price for base session in FCFA

  @Prop({ required: true })
  baseSessionDuration: number; // Duration in hours (default 4)

  @Prop({ required: true })
  overtimeRate: number; // Price per 30-minute block in FCFA

  @Prop({ default: 30 })
  overtimeIncrement: number; // Minutes (default 30)
}

export const CategoryPricingSchema =
  SchemaFactory.createForClass(CategoryPricing);

@Schema({ timestamps: true })
export class SessionConfig {
  @Prop({ type: [CategoryPricingSchema], required: true })
  categoryPricing: CategoryPricing[];

  @Prop({ default: 4 })
  defaultSessionDuration: number; // Hours

  @Prop({ default: 30 })
  defaultOvertimeIncrement: number; // Minutes

  @Prop({ default: 'FCFA' })
  currency: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;
}

export const SessionConfigSchema = SchemaFactory.createForClass(SessionConfig);
