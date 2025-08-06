import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../bookings/schemas/booking.schema';
import {
  Service,
  ServiceDocument,
} from '../../services/schemas/service.schema';
import {
  AnalyticsQueryDto,
  AnalyticsDto,
  BookingAnalytics,
  EarningsAnalytics,
  ServiceAnalytics,
  ServiceStat,
  RatingAnalytics,
  PeakHourData,
  WeeklyTrendData,
} from '../dto/analytics.dto';

@Injectable()
export class ProviderAnalyticsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async getAnalytics(
    providerId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsDto> {
    const providerObjectId = new Types.ObjectId(providerId);
    const { startDate, endDate } = this.parsePeriod(query.period);
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriod(query.period || 'month', startDate, endDate);

    const [
      bookingAnalytics,
      earningsAnalytics,
      serviceAnalytics,
      ratingAnalytics,
      peakHours,
      weeklyTrend,
    ] = await Promise.all([
      this.getBookingAnalytics(
        providerObjectId,
        startDate,
        endDate,
        prevStartDate,
        prevEndDate,
      ),
      this.getEarningsAnalytics(
        providerObjectId,
        startDate,
        endDate,
        prevStartDate,
        prevEndDate,
      ),
      this.getServiceAnalytics(providerObjectId, startDate, endDate),
      this.getRatingAnalytics(providerObjectId, startDate, endDate),
      this.getPeakHours(providerObjectId, startDate, endDate),
      this.getWeeklyTrend(providerObjectId, startDate, endDate),
    ]);

    return {
      period: query.period || 'month',
      bookings: bookingAnalytics,
      earnings: earningsAnalytics,
      services: serviceAnalytics,
      ratings: ratingAnalytics,
      peakHours,
      weeklyTrend,
    };
  }

  private async getBookingAnalytics(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<BookingAnalytics> {
    // Current period bookings
    const currentPeriod = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Previous period for growth calculation
    const previousPeriod = await this.bookingModel.countDocuments({
      providerId,
      createdAt: { $gte: prevStartDate, $lte: prevEndDate },
    });

    // Process current period results
    const statusMap = currentPeriod.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = Object.values(statusMap).reduce(
      (sum: number, count: number) => sum + count,
      0,
    );
    const completed = statusMap[BookingStatus.COMPLETED] || 0;
    const cancelled = statusMap[BookingStatus.CANCELLED] || 0;
    const pending = statusMap[BookingStatus.PENDING] || 0;

    // Calculate growth
    const totalNumber = total as number;
    let growth = 0;
    if (previousPeriod > 0) {
      growth = ((totalNumber - previousPeriod) / previousPeriod) * 100;
    } else if (totalNumber > 0) {
      growth = 100;
    }

    return {
      total: total as number,
      completed,
      cancelled,
      pending,
      growth: Math.round(growth * 10) / 10,
    };
  }

  private async getEarningsAnalytics(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<EarningsAnalytics> {
    // Current period earnings
    const currentEarnings = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
          bookingsCount: { $sum: 1 },
        },
      },
    ]);

    // Previous period earnings
    const previousEarnings = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          completedAt: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
        },
      },
    ]);

    const currentTotal =
      currentEarnings.length > 0 ? currentEarnings[0].totalEarnings : 0;
    const currentBookingsCount =
      currentEarnings.length > 0 ? currentEarnings[0].bookingsCount : 0;
    const previousTotal =
      previousEarnings.length > 0 ? previousEarnings[0].totalEarnings : 0;

    // Calculate growth
    let growth = 0;
    if (previousTotal > 0) {
      growth = ((currentTotal - previousTotal) / previousTotal) * 100;
    } else if (currentTotal > 0) {
      growth = 100;
    }

    // Calculate average earnings per booking
    const average =
      currentBookingsCount > 0 ? currentTotal / currentBookingsCount : 0;

    return {
      total: currentTotal,
      average: Math.round(average * 10) / 10,
      growth: Math.round(growth * 10) / 10,
    };
  }

  private async getServiceAnalytics(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<ServiceAnalytics> {
    const serviceStats = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceDetails',
        },
      },
      {
        $group: {
          _id: '$serviceId',
          title: {
            $first: {
              $ifNull: [
                { $arrayElemAt: ['$serviceDetails.title', 0] },
                '$serviceName',
              ],
            },
          },
          bookings: { $sum: 1 },
          earnings: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          title: 1,
          bookings: 1,
          earnings: 1,
        },
      },
    ]);

    // Find most booked and top earning services
    let mostBooked: ServiceStat = { title: 'N/A', bookings: 0, earnings: 0 };
    let topEarning: ServiceStat = { title: 'N/A', bookings: 0, earnings: 0 };

    if (serviceStats.length > 0) {
      // Sort by bookings for most booked
      const sortedByBookings = [...serviceStats].sort(
        (a, b) => b.bookings - a.bookings,
      );
      mostBooked = sortedByBookings[0];

      // Sort by earnings for top earning
      const sortedByEarnings = [...serviceStats].sort(
        (a, b) => b.earnings - a.earnings,
      );
      topEarning = sortedByEarnings[0];
    }

    return {
      mostBooked,
      topEarning,
    };
  }

  private async getRatingAnalytics(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<RatingAnalytics> {
    const ratingStats = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          seekerRating: { $exists: true, $ne: null },
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$seekerRating' },
          totalReviews: { $sum: 1 },
          ratings: { $push: '$seekerRating' },
        },
      },
    ]);

    if (ratingStats.length === 0) {
      return {
        average: 0,
        totalReviews: 0,
        distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };
    }

    const { averageRating, totalReviews, ratings } = ratingStats[0];

    // Calculate rating distribution
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    ratings.forEach((rating: number) => {
      const roundedRating = Math.round(rating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        distribution[roundedRating.toString()]++;
      }
    });

    return {
      average: Math.round(averageRating * 10) / 10,
      totalReviews,
      distribution,
    };
  }

  private async getPeakHours(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<PeakHourData[]> {
    const peakHourData = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          hour: {
            $hour: {
              $dateFromString: {
                dateString: {
                  $concat: [
                    {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$bookingDate',
                      },
                    },
                    'T',
                    '$startTime',
                    ':00',
                  ],
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$hour',
          bookings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          bookings: 1,
        },
      },
      {
        $sort: { bookings: -1 },
      },
      {
        $limit: 12, // Top 12 peak hours
      },
    ]);

    return peakHourData;
  }

  private async getWeeklyTrend(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<WeeklyTrendData[]> {
    const weeklyData = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          weekStart: {
            $dateFromParts: {
              isoWeekYear: { $isoWeekYear: '$completedAt' },
              isoWeek: { $isoWeek: '$completedAt' },
              isoDayOfWeek: 1,
            },
          },
          totalAmount: 1,
        },
      },
      {
        $group: {
          _id: '$weekStart',
          bookings: { $sum: 1 },
          earnings: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          date: { $dateToString: { format: '%Y-%m-%d', date: '$_id' } },
          bookings: 1,
          earnings: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    return weeklyData;
  }

  private parsePeriod(period?: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;

      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;

      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { startDate, endDate };
  }

  private getPreviousPeriod(
    period: string,
    currentStartDate: Date,
    currentEndDate: Date,
  ): { startDate: Date; endDate: Date } {
    switch (period) {
      case 'week':
        return {
          startDate: new Date(
            currentStartDate.getTime() - 7 * 24 * 60 * 60 * 1000,
          ),
          endDate: new Date(currentStartDate.getTime() - 1),
        };

      case 'month':
        const prevMonth = new Date(currentStartDate);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevMonthEnd = new Date(currentStartDate.getTime() - 1);
        return {
          startDate: prevMonth,
          endDate: prevMonthEnd,
        };

      case 'quarter':
        const prevQuarter = new Date(currentStartDate);
        prevQuarter.setMonth(prevQuarter.getMonth() - 3);
        const prevQuarterEnd = new Date(currentStartDate.getTime() - 1);
        return {
          startDate: prevQuarter,
          endDate: prevQuarterEnd,
        };

      case 'year':
        const prevYear = new Date(currentStartDate);
        prevYear.setFullYear(prevYear.getFullYear() - 1);
        const prevYearEnd = new Date(currentStartDate.getTime() - 1);
        return {
          startDate: prevYear,
          endDate: prevYearEnd,
        };

      default:
        // For month, use previous month
        const prevMonthDefault = new Date(currentStartDate);
        prevMonthDefault.setMonth(prevMonthDefault.getMonth() - 1);
        const prevMonthEndDefault = new Date(currentStartDate.getTime() - 1);
        return {
          startDate: prevMonthDefault,
          endDate: prevMonthEndDefault,
        };
    }
  }
}
