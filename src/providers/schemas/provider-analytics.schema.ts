import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { ServiceCategory } from '../../services/schemas/service.schema';

export type ProviderAnalyticsDocument = ProviderAnalytics & Document;

export enum AnalyticsPeriod {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export interface BookingStatistics {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  inProgress: number;
  rejected: number;
  completionRate: number;
  cancellationRate: number;
  growth: number; // Percentage growth compared to previous period
}

export interface EarningsStatistics {
  total: number;
  average: number;
  highest: number;
  lowest: number;
  growth: number; // Percentage growth compared to previous period
  averagePerBooking: number;
}

export interface ServiceStatistic {
  serviceId: Types.ObjectId;
  serviceName: string;
  category: ServiceCategory;
  bookingCount: number;
  totalEarnings: number;
  averageRating: number;
  completionRate: number;
}

export interface RatingStatistics {
  average: number;
  totalReviews: number;
  distribution: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  };
  recentTrend: number; // Trend in recent ratings compared to overall
}

export interface PeakHourData {
  hour: number; // 0-23
  bookingCount: number;
  totalEarnings: number;
  averageRating: number;
}

export interface WeeklyTrendData {
  weekStartDate: Date;
  weekEndDate: Date;
  bookingCount: number;
  totalEarnings: number;
  completedBookings: number;
  averageRating: number;
  newReviews: number;
}

@Schema({ timestamps: true })
export class ProviderAnalytics {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: AnalyticsPeriod,
    required: true,
  })
  period: AnalyticsPeriod;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  // Booking Statistics
  @Prop({ type: Object, required: true })
  bookingStats: BookingStatistics;

  // Earnings Statistics
  @Prop({ type: Object, required: true })
  earningsStats: EarningsStatistics;

  // Service Performance Data
  @Prop({ type: [Object], default: [] })
  serviceStats: ServiceStatistic[];

  @Prop({ type: Object })
  mostBookedService?: ServiceStatistic;

  @Prop({ type: Object })
  topEarningService?: ServiceStatistic;

  // Rating Statistics
  @Prop({ type: Object, required: true })
  ratingStats: RatingStatistics;

  // Peak Hours Analysis
  @Prop({ type: [Object], default: [] })
  peakHours: PeakHourData[];

  // Weekly Trend Data
  @Prop({ type: [Object], default: [] })
  weeklyTrend: WeeklyTrendData[];

  // Calculation Timestamps
  @Prop({ default: Date.now })
  calculatedAt: Date;

  @Prop()
  calculationDuration?: number; // Time taken to calculate in milliseconds

  @Prop({ default: false })
  isStale: boolean; // Flag to indicate if data needs recalculation
}

export const ProviderAnalyticsSchema =
  SchemaFactory.createForClass(ProviderAnalytics);

// Create indexes for efficient analytics queries by provider and period
ProviderAnalyticsSchema.index({ providerId: 1, period: 1 });
ProviderAnalyticsSchema.index({ providerId: 1, startDate: 1, endDate: 1 });
ProviderAnalyticsSchema.index({ providerId: 1, calculatedAt: -1 });
ProviderAnalyticsSchema.index({ period: 1, calculatedAt: -1 });
ProviderAnalyticsSchema.index({ isStale: 1, calculatedAt: 1 });

// Compound index for efficient period-based queries
ProviderAnalyticsSchema.index({
  providerId: 1,
  period: 1,
  startDate: 1,
});

// Index for cleanup operations (removing old analytics data)
ProviderAnalyticsSchema.index({ calculatedAt: 1 });
