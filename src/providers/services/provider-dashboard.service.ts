import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../bookings/schemas/booking.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Wallet, WalletDocument } from '../../wallet/schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from '../../wallet/schemas/transaction.schema';
import {
  DashboardSummaryDto,
  ProviderSummaryDto,
  ProviderStatisticsDto,
  NextBookingDto,
  ActivityDto,
} from '../dto/dashboard-summary.dto';

@Injectable()
export class ProviderDashboardService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async getDashboardSummary(providerId: string): Promise<DashboardSummaryDto> {
    const providerObjectId = new Types.ObjectId(providerId);

    // Get all required data in parallel for better performance
    const [provider, wallet, bookingStats, nextBooking, recentActivities] =
      await Promise.all([
        this.getProviderInfo(providerObjectId),
        this.getWalletInfo(providerObjectId),
        this.calculateBookingStatistics(providerObjectId),
        this.getNextUpcomingBooking(providerObjectId),
        this.getRecentActivities(providerObjectId),
      ]);

    return {
      provider,
      statistics: bookingStats,
      nextBooking,
      recentActivities,
    };
  }

  private async getProviderInfo(
    providerId: Types.ObjectId,
  ): Promise<ProviderSummaryDto> {
    const provider = await this.userModel.findById(providerId).exec();
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const wallet = await this.walletModel.findOne({ providerId }).exec();

    // Calculate average rating from completed bookings
    const ratingStats = await this.bookingModel.aggregate([
      {
        $match: {
          providerId,
          status: BookingStatus.COMPLETED,
          seekerRating: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$seekerRating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const rating =
      ratingStats.length > 0
        ? ratingStats[0]
        : { averageRating: 0, totalReviews: 0 };

    return {
      id: (provider._id as any).toString(),
      fullName: provider.fullName,
      totalEarnings: wallet?.totalEarnings || 0,
      availableBalance: wallet?.balance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      totalWithdrawn: wallet?.totalWithdrawn || 0,
      averageRating: Math.round(rating.averageRating * 10) / 10 || 0,
      totalReviews: rating.totalReviews || 0,
      joinedDate: (provider as any).createdAt || new Date(),
    };
  }

  private async getWalletInfo(
    providerId: Types.ObjectId,
  ): Promise<WalletDocument | null> {
    return this.walletModel.findOne({ providerId }).exec();
  }

  private async calculateBookingStatistics(
    providerId: Types.ObjectId,
  ): Promise<ProviderStatisticsDto> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setTime(endOfLastWeek.getTime() - 1);

    // Get booking statistics
    const [
      totalBookings,
      thisWeekBookings,
      thisMonthBookings,
      lastWeekBookings,
      lastMonthEarnings,
      thisMonthEarnings,
      statusCounts,
      activeServices,
    ] = await Promise.all([
      // Total bookings
      this.bookingModel.countDocuments({ providerId }),

      // This week bookings
      this.bookingModel.countDocuments({
        providerId,
        createdAt: { $gte: startOfWeek },
      }),

      // This month bookings
      this.bookingModel.countDocuments({
        providerId,
        createdAt: { $gte: startOfMonth },
      }),

      // Last week bookings for growth calculation
      this.bookingModel.countDocuments({
        providerId,
        createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek },
      }),

      // Last month earnings for growth calculation
      this.bookingModel.aggregate([
        {
          $match: {
            providerId,
            status: BookingStatus.COMPLETED,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$totalAmount' },
          },
        },
      ]),

      // This month earnings
      this.bookingModel.aggregate([
        {
          $match: {
            providerId,
            status: BookingStatus.COMPLETED,
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$totalAmount' },
          },
        },
      ]),

      // Booking status counts
      this.bookingModel.aggregate([
        { $match: { providerId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Active services count (assuming we have a services collection)
      // For now, we'll estimate based on unique service IDs in bookings
      this.bookingModel.distinct('serviceId', { providerId }),
    ]);

    // Process status counts
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Calculate growth percentages
    const lastMonthEarningsAmount =
      lastMonthEarnings.length > 0 ? lastMonthEarnings[0].totalEarnings : 0;
    const thisMonthEarningsAmount =
      thisMonthEarnings.length > 0 ? thisMonthEarnings[0].totalEarnings : 0;

    const monthlyEarningsGrowth =
      lastMonthEarningsAmount > 0
        ? ((thisMonthEarningsAmount - lastMonthEarningsAmount) /
            lastMonthEarningsAmount) *
          100
        : thisMonthEarningsAmount > 0
          ? 100
          : 0;

    const weeklyBookingsGrowth =
      lastWeekBookings > 0
        ? ((thisWeekBookings - lastWeekBookings) / lastWeekBookings) * 100
        : thisWeekBookings > 0
          ? 100
          : 0;

    return {
      activeServices: activeServices.length,
      totalBookings,
      thisWeekBookings,
      thisMonthBookings,
      completedBookings: statusMap[BookingStatus.COMPLETED] || 0,
      cancelledBookings: statusMap[BookingStatus.CANCELLED] || 0,
      pendingBookings: statusMap[BookingStatus.PENDING] || 0,
      monthlyEarningsGrowth: Math.round(monthlyEarningsGrowth * 10) / 10,
      weeklyBookingsGrowth: Math.round(weeklyBookingsGrowth * 10) / 10,
    };
  }

  private async getNextUpcomingBooking(
    providerId: Types.ObjectId,
  ): Promise<NextBookingDto | undefined> {
    const now = new Date();

    const nextBooking = await this.bookingModel
      .findOne({
        providerId,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        bookingDate: { $gte: now },
      })
      .populate('seekerId', 'fullName')
      .populate('serviceId', 'title')
      .sort({ bookingDate: 1, startTime: 1 })
      .exec();

    if (!nextBooking) {
      return undefined;
    }

    return {
      _id: (nextBooking._id as any).toString(),
      serviceTitle:
        (nextBooking.serviceId as any)?.title ||
        nextBooking.serviceName ||
        'Unknown Service',
      seekerName: (nextBooking.seekerId as any)?.fullName || 'Unknown Seeker',
      bookingDate: nextBooking.bookingDate,
      startTime: nextBooking.startTime,
      endTime: nextBooking.endTime,
      totalAmount: nextBooking.totalAmount,
      status: nextBooking.status,
      serviceLocation: nextBooking.serviceLocation,
    };
  }

  private async getRecentActivities(
    providerId: Types.ObjectId,
  ): Promise<ActivityDto[]> {
    const activities: ActivityDto[] = [];

    // Get recent completed bookings
    const recentBookings = await this.bookingModel
      .find({
        providerId,
        status: BookingStatus.COMPLETED,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      })
      .populate('seekerId', 'fullName')
      .populate('serviceId', 'title')
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    recentBookings.forEach((booking) => {
      activities.push({
        type: 'booking_completed',
        title: 'Service completed',
        description: `${(booking.serviceId as any)?.title || booking.serviceName} for ${(booking.seekerId as any)?.fullName}`,
        amount: booking.totalAmount,
        timestamp: (booking as any).updatedAt || (booking as any).createdAt,
      });
    });

    // Get recent reviews
    const recentReviews = await this.bookingModel
      .find({
        providerId,
        seekerRating: { $exists: true, $ne: null },
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
      .populate('seekerId', 'fullName')
      .sort({ updatedAt: -1 })
      .limit(3)
      .exec();

    recentReviews.forEach((booking) => {
      activities.push({
        type: 'review_received',
        title: 'New review received',
        description: `${booking.seekerRating}-star review from ${(booking.seekerId as any)?.fullName}`,
        rating: booking.seekerRating,
        timestamp: (booking as any).updatedAt || (booking as any).createdAt,
      });
    });

    // Get recent withdrawals
    const recentWithdrawals = await this.transactionModel
      .find({
        providerId,
        type: TransactionType.WITHDRAWAL,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .exec();

    recentWithdrawals.forEach((withdrawal) => {
      activities.push({
        type: 'withdrawal_processed',
        title: 'Withdrawal processed',
        description: `Withdrawal of ${withdrawal.amount} FCFA`,
        amount: withdrawal.amount,
        timestamp: (withdrawal as any).createdAt,
      });
    });

    // Sort all activities by timestamp and return top 10
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);
  }
}
