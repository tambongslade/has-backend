import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../../bookings/schemas/session.schema';
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
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
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

    // Calculate average rating from completed sessions
    const ratingStats = await this.sessionModel.aggregate([
      {
        $match: {
          providerId,
          status: SessionStatus.COMPLETED,
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

    // Get session statistics
    const [
      totalSessions,
      thisWeekSessions,
      thisMonthSessions,
      lastWeekSessions,
      lastMonthEarnings,
      thisMonthEarnings,
      statusCounts,
      activeServices,
    ] = await Promise.all([
      // Total sessions
      this.sessionModel.countDocuments({ providerId }),

      // This week sessions
      this.sessionModel.countDocuments({
        providerId,
        createdAt: { $gte: startOfWeek },
      }),

      // This month sessions
      this.sessionModel.countDocuments({
        providerId,
        createdAt: { $gte: startOfMonth },
      }),

      // Last week sessions for growth calculation
      this.sessionModel.countDocuments({
        providerId,
        createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek },
      }),

      // Last month earnings for growth calculation
      this.sessionModel.aggregate([
        {
          $match: {
            providerId,
            status: SessionStatus.COMPLETED,
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
      this.sessionModel.aggregate([
        {
          $match: {
            providerId,
            status: SessionStatus.COMPLETED,
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

      // Session status counts
      this.sessionModel.aggregate([
        { $match: { providerId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Active services count (assuming we have a services collection)
      // For now, we'll estimate based on unique service IDs in sessions
      this.sessionModel.distinct('serviceId', { providerId }),
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

    const weeklySessionsGrowth =
      lastWeekSessions > 0
        ? ((thisWeekSessions - lastWeekSessions) / lastWeekSessions) * 100
        : thisWeekSessions > 0
          ? 100
          : 0;

    return {
      activeServices: activeServices.length,
      totalBookings: totalSessions,
      thisWeekBookings: thisWeekSessions,
      thisMonthBookings: thisMonthSessions,
      completedBookings: statusMap[SessionStatus.COMPLETED] || 0,
      cancelledBookings: statusMap[SessionStatus.CANCELLED] || 0,
      pendingBookings: statusMap[SessionStatus.PENDING_ASSIGNMENT] || 0,
      monthlyEarningsGrowth: Math.round(monthlyEarningsGrowth * 10) / 10,
      weeklyBookingsGrowth: Math.round(weeklySessionsGrowth * 10) / 10,
    };
  }

  private async getNextUpcomingBooking(
    providerId: Types.ObjectId,
  ): Promise<NextBookingDto | undefined> {
    const now = new Date();

    const nextSession = await this.sessionModel
      .findOne({
        providerId,
        status: {
          $in: [SessionStatus.CONFIRMED, SessionStatus.PENDING_ASSIGNMENT],
        },
        sessionDate: { $gte: now },
      })
      .populate('seekerId', 'fullName')
      .populate('serviceId', 'title')
      .sort({ sessionDate: 1, startTime: 1 })
      .exec();

    if (!nextSession) {
      return undefined;
    }

    return {
      _id: (nextSession._id as any).toString(),
      serviceTitle:
        (nextSession.serviceId as any)?.title ||
        nextSession.serviceName ||
        'Unknown Service',
      seekerName: (nextSession.seekerId as any)?.fullName || 'Unknown Seeker',
      bookingDate: nextSession.sessionDate,
      startTime: nextSession.startTime,
      endTime: nextSession.endTime,
      totalAmount: nextSession.totalAmount,
      status: nextSession.status,
      serviceLocation: nextSession.serviceLocation,
    };
  }

  private async getRecentActivities(
    providerId: Types.ObjectId,
  ): Promise<ActivityDto[]> {
    const activities: ActivityDto[] = [];

    // Get recent completed sessions
    const recentSessions = await this.sessionModel
      .find({
        providerId,
        status: SessionStatus.COMPLETED,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      })
      .populate('seekerId', 'fullName')
      .populate('serviceId', 'title')
      .sort({ updatedAt: -1 })
      .limit(5)
      .exec();

    recentSessions.forEach((session) => {
      activities.push({
        type: 'booking_completed',
        title: 'Service completed',
        description: `${(session.serviceId as any)?.title || session.serviceName} for ${(session.seekerId as any)?.fullName}`,
        amount: session.totalAmount,
        timestamp: (session as any).updatedAt || (session as any).createdAt,
      });
    });

    // Get recent reviews
    const recentReviews = await this.sessionModel
      .find({
        providerId,
        seekerRating: { $exists: true, $ne: null },
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
      .populate('seekerId', 'fullName')
      .sort({ updatedAt: -1 })
      .limit(3)
      .exec();

    recentReviews.forEach((session) => {
      activities.push({
        type: 'review_received',
        title: 'New review received',
        description: `${session.seekerRating}-star review from ${(session.seekerId as any)?.fullName}`,
        rating: session.seekerRating,
        timestamp: (session as any).updatedAt || (session as any).createdAt,
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
