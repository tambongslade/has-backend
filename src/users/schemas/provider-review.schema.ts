import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ServiceCategory } from '../../services/schemas/service.schema';

export type ProviderReviewDocument = ProviderReview & Document;

export enum ReviewStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
  PENDING_MODERATION = 'pending_moderation',
}

@Schema({ _id: false })
export class ProviderResponse {
  @Prop({ required: true, maxlength: 300 })
  text: string;

  @Prop({ required: true, default: Date.now })
  respondedAt: Date;

  @Prop()
  editedAt?: Date;
}

@Schema({ _id: false })
export class ModerationInfo {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  moderatedBy: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  moderatedAt: Date;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: String, enum: ReviewStatus, required: true })
  originalStatus: ReviewStatus;
}

@Schema({ _id: false })
export class EditHistoryEntry {
  @Prop({ required: true, default: Date.now })
  editedAt: Date;

  @Prop({ min: 1, max: 5 })
  previousRating?: number;

  @Prop({ maxlength: 500 })
  previousComment?: string;
}

@Schema({ timestamps: true })
export class ProviderReview {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ maxlength: 500 })
  comment?: string;

  @Prop({ type: String, enum: ServiceCategory })
  serviceCategory?: ServiceCategory;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  relatedBookingId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.ACTIVE,
  })
  status: ReviewStatus;

  @Prop({ type: ProviderResponse })
  providerResponse?: ProviderResponse;

  @Prop({ type: ModerationInfo })
  moderationInfo?: ModerationInfo;

  @Prop({ type: [EditHistoryEntry], default: [] })
  editHistory: EditHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export const ProviderReviewSchema =
  SchemaFactory.createForClass(ProviderReview);

// Create indexes for efficient querying
ProviderReviewSchema.index({ providerId: 1, createdAt: -1 });
ProviderReviewSchema.index({ reviewerId: 1, createdAt: -1 });
ProviderReviewSchema.index({ providerId: 1, serviceCategory: 1 });
ProviderReviewSchema.index({ providerId: 1, rating: 1 });
ProviderReviewSchema.index({ relatedBookingId: 1 });
ProviderReviewSchema.index({ status: 1 });

// Compound index for efficient queries
ProviderReviewSchema.index({
  providerId: 1,
  status: 1,
  serviceCategory: 1,
  createdAt: -1,
});

// Unique compound index to prevent duplicate reviews from same reviewer to same provider
ProviderReviewSchema.index(
  {
    providerId: 1,
    reviewerId: 1,
  },
  { unique: true },
);
