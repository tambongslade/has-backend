import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ServiceCategory } from '../../services/schemas/service.schema';

export type ProviderStatisticsDocument = ProviderStatistics & Document;

@Schema({ _id: false })
export class RatingDistribution {
  @Prop({ default: 0 })
  fiveStars: number;

  @Prop({ default: 0 })
  fourStars: number;

  @Prop({ default: 0 })
  threeStars: number;

  @Prop({ default: 0 })
  twoStars: number;

  @Prop({ default: 0 })
  oneStar: number;
}

export const RatingDistributionSchema =
  SchemaFactory.createForClass(RatingDistribution);

@Schema({ _id: false })
export class CategoryRating {
  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0 })
  totalReviews: number;
}

export const CategoryRatingSchema =
  SchemaFactory.createForClass(CategoryRating);

@Schema({ timestamps: true })
export class ProviderStatistics {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0 })
  totalReviews: number;

  @Prop({ type: RatingDistribution, default: () => ({}) })
  ratingDistribution: RatingDistribution;

  @Prop({
    type: Map,
    of: CategoryRatingSchema,
    default: new Map(),
  })
  categoryRatings: Map<ServiceCategory, CategoryRating>;

  @Prop()
  lastReviewDate?: Date;

  @Prop({ default: 0, min: 0 })
  recentReviewsCount: number; // Reviews in last 30 days

  updatedAt: Date;
}

export const ProviderStatisticsSchema =
  SchemaFactory.createForClass(ProviderStatistics);

// Create unique index on providerId
ProviderStatisticsSchema.index({ providerId: 1 }, { unique: true });

// Index for efficient queries
ProviderStatisticsSchema.index({ averageRating: -1 });
ProviderStatisticsSchema.index({ totalReviews: -1 });
ProviderStatisticsSchema.index({ lastReviewDate: -1 });
