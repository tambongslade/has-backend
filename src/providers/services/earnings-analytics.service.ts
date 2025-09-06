import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../../bookings/schemas/session.schema';
import { Wallet, WalletDocument } from '../../wallet/schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from '../../wallet/schemas/transaction.schema';
import {
  EarningsQueryDto,
  EarningsSummaryDto,
  EarningsSummary,
  PeriodEarnings,
  DailyEarnings,
} from '../dto/earnings.dto';

@Injectable()
export class EarningsAnalyticsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async getEarningsSummary(
    providerId: string,
    query: EarningsQueryDto,
  ): Promise<EarningsSummaryDto> {
    const providerObjectId = new Types.ObjectId(providerId);
    const { startDate, endDate } = this.parsePeriod(
      query.period,
      query.startDate,
      query.endDate,
    );

    const [summary, periodEarnings, breakdown] = await Promise.all([
      this.calculateEarningsSummary(providerObjectId),
      this.calculatePeriodEarnings(
        providerObjectId,
        query.period || 'month',
        startDate,
        endDate,
      ),
      this.getDailyEarningsBreakdown(providerObjectId, startDate, endDate),
    ]);

    return {
      summary,
      periodEarnings,
      earningsBreakdown: breakdown,
    };
  }

  private async calculateEarningsSummary(
    providerId: Types.ObjectId,
  ): Promise<EarningsSummary> {
    const wallet = await this.walletModel.findOne({ providerId }).exec();

    if (!wallet) {
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalWithdrawn: 0,
      };
    }

    return {
      totalEarnings: wallet.totalEarnings || 0,
      availableBalance: wallet.balance || 0,
      pendingBalance: wallet.pendingBalance || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
    };
  }

  private async calculatePeriodEarnings(
    providerId: Types.ObjectId,
    period: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PeriodEarnings> {
    // Calculate current period earnings
    const currentPeriodResults = await this.sessionModel.aggregate([
      {
        $match: {
          providerId,
          status: SessionStatus.COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          bookingsCount: { $sum: 1 },
        },
      },
    ]);

    // Calculate previous period for growth comparison
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriod(period, startDate, endDate);

    const previousPeriodResults = await this.sessionModel.aggregate([
      {
        $match: {
          providerId,
          status: SessionStatus.COMPLETED,
          completedAt: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const currentAmount =
      currentPeriodResults.length > 0 ? currentPeriodResults[0].totalAmount : 0;
    const currentBookingsCount =
      currentPeriodResults.length > 0
        ? currentPeriodResults[0].bookingsCount
        : 0;
    const previousAmount =
      previousPeriodResults.length > 0
        ? previousPeriodResults[0].totalAmount
        : 0;

    // Calculate growth percentage
    let growth = 0;
    if (previousAmount > 0) {
      growth = ((currentAmount - previousAmount) / previousAmount) * 100;
    } else if (currentAmount > 0) {
      growth = 100; // 100% growth from zero
    }

    return {
      period: period || 'custom',
      amount: currentAmount,
      growth: Math.round(growth * 10) / 10,
      bookingsCount: currentBookingsCount,
    };
  }

  private async getDailyEarningsBreakdown(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyEarnings[]> {
    const dailyBreakdown = await this.sessionModel.aggregate([
      {
        $match: {
          providerId,
          status: SessionStatus.COMPLETED,
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
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
          },
          amount: { $sum: '$totalAmount' },
          bookingsCount: { $sum: 1 },
          services: {
            $push: {
              $ifNull: [
                { $arrayElemAt: ['$serviceDetails.title', 0] },
                '$serviceName',
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          amount: 1,
          bookingsCount: 1,
          services: { $setUnion: ['$services', []] }, // Remove duplicates
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    return dailyBreakdown.map((day) => ({
      date: day.date,
      amount: day.amount,
      bookingsCount: day.bookingsCount,
      services: day.services || [],
    }));
  }

  private parsePeriod(
    period?: string,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // If custom dates are provided, use them
    if (startDateStr && endDateStr) {
      return {
        startDate: new Date(startDateStr + 'T00:00:00.000Z'),
        endDate: new Date(endDateStr + 'T23:59:59.999Z'),
      };
    }

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

      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;

      case 'all':
        startDate = new Date(2020, 0, 1); // Assume platform started in 2020
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
    const duration = currentEndDate.getTime() - currentStartDate.getTime();

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

      case 'year':
        const prevYear = new Date(currentStartDate);
        prevYear.setFullYear(prevYear.getFullYear() - 1);
        const prevYearEnd = new Date(currentStartDate.getTime() - 1);
        return {
          startDate: prevYear,
          endDate: prevYearEnd,
        };

      default:
        // For custom periods, use same duration before current period
        return {
          startDate: new Date(currentStartDate.getTime() - duration),
          endDate: new Date(currentStartDate.getTime() - 1),
        };
    }
  }

  async getEarningsProjection(
    providerId: string,
    days: number = 30,
  ): Promise<number> {
    const providerObjectId = new Types.ObjectId(providerId);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const result = await this.sessionModel.aggregate([
      {
        $match: {
          providerId: providerObjectId,
          status: SessionStatus.COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
          totalDays: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return 0;
    }

    const dailyAverage = result[0].totalEarnings / days;
    return Math.round(dailyAverage * 30); // Project for next 30 days
  }
}
