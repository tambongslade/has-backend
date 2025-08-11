import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { Session, SessionDocument, SessionStatus } from '../bookings/schemas/session.schema';
import { Service, ServiceDocument } from '../services/schemas/service.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';
import { Transaction, TransactionDocument } from '../wallet/schemas/transaction.schema';
import { ProviderReview, ProviderReviewDocument } from '../users/schemas/provider-review.schema';
import { Availability, AvailabilityDocument } from '../bookings/schemas/availability.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(ProviderReview.name) private reviewModel: Model<ProviderReviewDocument>,
    @InjectModel(Availability.name) private availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async updateUserStatus(userId: string, isActive: boolean) {
    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true },
    );
    return {
      id: (updated?._id as any)?.toString?.() ?? userId,
      isActive: updated?.isActive ?? isActive,
    };
  }

  async getDashboardOverview() {
    // Date helpers
    const now = new Date();
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const startOfTomorrow = (d: Date) => {
      const x = startOfDay(d);
      x.setDate(x.getDate() + 1);
      return x;
    };
    const startOfYesterday = (d: Date) => {
      const x = startOfDay(d);
      x.setDate(x.getDate() - 1);
      return x;
    };
    const startOfMonth = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth(), 1);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const startOfNextMonth = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const startOfPrevMonth = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const todayStart = startOfDay(now);
    const tomorrowStart = startOfTomorrow(now);
    const yesterdayStart = startOfYesterday(now);
    const monthStart = startOfMonth(now);
    const nextMonthStart = startOfNextMonth(now);
    const prevMonthStart = startOfPrevMonth(now);

    // Core counts
    const [
      totalUsers,
      totalProviders,
      totalSeekers,
      totalServices,
      totalSessions,
      totalActiveServices,
      sessionsToday,
      sessionsYesterday,
      totalUsersThisMonth,
      totalUsersLastMonth
    ] = await Promise.all([
      this.userModel.countDocuments({}),
      this.userModel.countDocuments({ role: UserRole.PROVIDER }),
      this.userModel.countDocuments({ role: UserRole.SEEKER }),
      this.serviceModel.countDocuments({}),
      this.sessionModel.countDocuments({}),
      this.serviceModel.countDocuments({ isAvailable: true }),
      this.sessionModel.countDocuments({ createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      this.sessionModel.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
      this.userModel.countDocuments({ createdAt: { $gte: monthStart, $lt: nextMonthStart } }),
      this.userModel.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: monthStart } })
    ]);

    const pct = (curr: number, prev: number) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    // Revenue and commission for current month
    const [revenueMonthAgg, revenuePrevMonthAgg] = await Promise.all([
      this.sessionModel.aggregate([
        { $match: { status: SessionStatus.COMPLETED, updatedAt: { $gte: monthStart, $lt: nextMonthStart } } },
        { $group: { _id: null, amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      this.sessionModel.aggregate([
        { $match: { status: SessionStatus.COMPLETED, updatedAt: { $gte: prevMonthStart, $lt: monthStart } } },
        { $group: { _id: null, amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ])
    ]);
    const revenueThisMonth = revenueMonthAgg[0]?.amount || 0;
    const revenueLastMonth = revenuePrevMonthAgg[0]?.amount || 0;
    const platformEarningsThisMonth = revenueThisMonth * 0.1;
    const platformEarningsLastMonth = revenueLastMonth * 0.1;

    // Completion rate this month
    const [sessionsInMonth, completedInMonth, sessionsPrevMonth, completedPrevMonth] = await Promise.all([
      this.sessionModel.countDocuments({ createdAt: { $gte: monthStart, $lt: nextMonthStart } }),
      this.sessionModel.countDocuments({ status: SessionStatus.COMPLETED, updatedAt: { $gte: monthStart, $lt: nextMonthStart } }),
      this.sessionModel.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: monthStart } }),
      this.sessionModel.countDocuments({ status: SessionStatus.COMPLETED, updatedAt: { $gte: prevMonthStart, $lt: monthStart } })
    ]);
    const completionRate = sessionsInMonth ? (completedInMonth / sessionsInMonth) * 100 : 0;
    const completionRatePrev = sessionsPrevMonth ? (completedPrevMonth / sessionsPrevMonth) * 100 : 0;
    const completionRateChange = completionRatePrev ? completionRate - completionRatePrev : completionRate;

    // Active providers (providers with at least one session this month)
    const [activeProvidersAgg, activeProvidersPrevAgg] = await Promise.all([
      this.sessionModel.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lt: nextMonthStart } } },
        { $group: { _id: '$providerId' } },
        { $count: 'count' }
      ]),
      this.sessionModel.aggregate([
        { $match: { createdAt: { $gte: prevMonthStart, $lt: monthStart } } },
        { $group: { _id: '$providerId' } },
        { $count: 'count' }
      ])
    ]);
    const activeProviders = activeProvidersAgg[0]?.count || 0;
    const activeProvidersPrev = activeProvidersPrevAgg[0]?.count || 0;

    // Average rating and change (current vs prev month)
    const [avgRatingCurrAgg, avgRatingPrevAgg] = await Promise.all([
      this.reviewModel.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lt: nextMonthStart } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]),
      this.reviewModel.aggregate([
        { $match: { createdAt: { $gte: prevMonthStart, $lt: monthStart } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ]);
    const averageRating = Number((avgRatingCurrAgg[0]?.avg || 0).toFixed(1));
    const averageRatingPrev = Number((avgRatingPrevAgg[0]?.avg || 0).toFixed(1));
    const averageRatingChange = Number((averageRating - averageRatingPrev).toFixed(1));

    // Service categories distribution for current month
    const categoryStats = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED, updatedAt: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: '$category', sessions: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } }
    ]);

    // Top performing providers this month
    const topProvidersAgg = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED, updatedAt: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: '$providerId', earnings: { $sum: '$totalAmount' }, sessions: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
      { $limit: 5 }
    ]);
    const topProviderIds = Array.isArray(topProvidersAgg) ? topProvidersAgg.map(p => p._id) : [];
    const topProviderUsers = await this.userModel
      .find({ _id: { $in: topProviderIds } })
      .select('fullName role')
      .lean();
    const providerIdToUser = new Map(topProviderUsers.map(u => [u._id.toString(), u]));

    // Recent activity (very simple feed)
    const [recentSessions, recentProviders, recentTransactions, recentCompletedSessions] = await Promise.all([
      this.sessionModel.find({}).sort({ createdAt: -1 }).limit(5).lean(),
      this.userModel.find({ role: UserRole.PROVIDER }).sort({ createdAt: -1 }).limit(5).lean(),
      this.transactionModel.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(5).lean(),
      this.sessionModel.find({ status: SessionStatus.COMPLETED }).sort({ updatedAt: -1 }).limit(5).lean()
    ]);

    const recentActivity = [
      ...recentSessions.map(s => ({
        type: 'session_created',
        title: 'New session booked',
        description: `${s.serviceName || 'Session'} booked`,
        timestamp: (s as any).createdAt
      })),
      ...recentProviders.map(u => ({
        type: 'provider_registered',
        title: 'New provider registered',
        description: `${u.fullName} joined as Provider`,
        timestamp: (u as any).createdAt
      })),
      ...recentTransactions.map(t => ({
        type: 'payment_completed',
        title: 'Payment completed',
        description: `Transaction ${t.transactionReference || ''} - ${(t.amount || 0).toLocaleString()} FCFA received`,
        timestamp: (t as any).createdAt
      })),
      ...recentCompletedSessions.map(s => ({
        type: 'session_completed',
        title: 'Session completed',
        description: `${s.serviceName || 'Session'} completed`,
        timestamp: (s as any).updatedAt
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Compose response aligned with requested widgets
    return {
      // Key tiles
      sessionsToday: {
        count: sessionsToday,
        changePct: Number(pct(sessionsToday, sessionsYesterday).toFixed(1))
      },
      totalRevenueThisMonth: {
        amount: revenueThisMonth,
        currency: 'FCFA'
      },
      totalUsers: {
        count: totalUsers,
        growthPct: Number(pct(totalUsersThisMonth, totalUsersLastMonth).toFixed(1))
      },
      activeUsersThisMonth: {
        // Users created this month (proxy); if you prefer users who participated in sessions, we can change
        count: totalUsersThisMonth
      },
      platformEarningsThisMonth: {
        amount: platformEarningsThisMonth,
        changePct: Number(pct(platformEarningsThisMonth, platformEarningsLastMonth).toFixed(1))
      },
      completionRate: {
        valuePct: Number(completionRate.toFixed(1)),
        changePct: Number(completionRateChange.toFixed(1))
      },
      totalSessionsThisMonth: {
        count: sessionsInMonth,
        growthPct: Number(pct(sessionsInMonth, sessionsPrevMonth).toFixed(1))
      },
      activeProviders: {
        count: activeProviders,
        growthPct: Number(pct(activeProviders, activeProvidersPrev).toFixed(1))
      },
      averageRating: {
        value: averageRating,
        change: averageRatingChange
      },

      // Revenue Analytics (monthly)
      revenueAnalytics: await (async () => {
        const revenueByPeriod = await this.sessionModel.aggregate([
          { $match: { status: SessionStatus.COMPLETED } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$sessionDate' } },
              revenue: { $sum: '$totalAmount' },
              sessions: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 12 }
        ]);
        return revenueByPeriod.map(r => ({ period: r._id, revenue: r.revenue, sessions: r.sessions }));
      })(),

      // Service Categories
      serviceCategories: categoryStats.map(cat => ({
        category: cat._id,
        sessions: cat.sessions,
        revenue: cat.revenue
      })),

      // Top Providers
      topProviders: topProvidersAgg.map(p => {
        const u = providerIdToUser.get(p._id.toString());
        return {
          providerId: p._id,
          fullName: u?.fullName || 'Unknown',
          earnings: p.earnings,
          sessions: p.sessions
        };
      }),

      // Recent Activity
      recentActivity
    };
  }

  async getUserManagement(page = 1, limit = 50, role?: string, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(query)
    ]);

    // Get user statistics (sessions, earnings, ratings)
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();

        if (user.role === UserRole.PROVIDER) {
          const [sessions, wallet, reviews] = await Promise.all([
            this.sessionModel.countDocuments({ providerId: new Types.ObjectId(userId) }),
            this.walletModel.findOne({ providerId: new Types.ObjectId(userId) }),
            this.reviewModel.aggregate([
              { $match: { providerId: new Types.ObjectId(userId) } },
              {
                $group: {
                  _id: null,
                  averageRating: { $avg: '$rating' },
                  totalReviews: { $sum: 1 }
                }
              }
            ])
          ]);

          return {
            ...user,
            totalSessions: sessions,
            totalEarned: wallet?.totalEarnings || 0,
            averageRating: reviews[0]?.averageRating || 0,
            totalReviews: reviews[0]?.totalReviews || 0
          };
        } else {
          const [sessions, totalSpent] = await Promise.all([
            this.sessionModel.countDocuments({ seekerId: new Types.ObjectId(userId) }),
            this.sessionModel.aggregate([
              { $match: { seekerId: new Types.ObjectId(userId), status: SessionStatus.COMPLETED } },
              { $group: { _id: null, totalSpent: { $sum: '$totalAmount' } } }
            ])
          ]);

          return {
            ...user,
            totalSessions: sessions,
            totalSpent: totalSpent[0]?.totalSpent || 0
          };
        }
      })
    );

    return {
      users: usersWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProviderAnalytics() {
    // Top performing providers
    const topProviders = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED } },
      {
        $group: {
          _id: '$providerId',
          totalSessions: { $sum: 1 },
          totalEarnings: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 }
    ]);

    const topProvidersWithDetails = await Promise.all(
      topProviders.map(async (provider) => {
        const [user, reviews, services] = await Promise.all([
          this.userModel.findById(provider._id).select('fullName email'),
          this.reviewModel.aggregate([
            { $match: { providerId: provider._id } },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
              }
            }
          ]),
          this.serviceModel.countDocuments({ providerId: provider._id })
        ]);

        // Calculate completion rate
        const [totalSessions, completedSessions] = await Promise.all([
          this.sessionModel.countDocuments({ providerId: provider._id }),
          this.sessionModel.countDocuments({ 
            providerId: provider._id, 
            status: SessionStatus.COMPLETED 
          })
        ]);

        const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

        return {
          id: provider._id,
          fullName: user?.fullName || 'Unknown',
          email: user?.email || '',
          totalSessions: provider.totalSessions,
          totalEarnings: provider.totalEarnings * 0.9, // After commission
          averageRating: reviews[0]?.averageRating || 0,
          totalReviews: reviews[0]?.totalReviews || 0,
          completionRate,
          totalServices: services
        };
      })
    );

    // Providers by category
    const providersByCategory = await this.serviceModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $addToSet: '$providerId' }
        }
      },
      {
        $project: {
          _id: 1,
          count: { $size: '$count' }
        }
      }
    ]);

    const categoryBreakdown = {};
    providersByCategory.forEach(cat => {
      categoryBreakdown[cat._id] = cat.count;
    });

    // Availability stats
    const [totalProviders, providersWithAvailability] = await Promise.all([
      this.userModel.countDocuments({ role: UserRole.PROVIDER }),
      this.availabilityModel.distinct('providerId').then(ids => ids.length)
    ]);

    return {
      topProviders: topProvidersWithDetails,
      providersByCategory: categoryBreakdown,
      availabilityStats: {
        totalProviders,
        totalWithAvailability: providersWithAvailability,
        totalWithoutAvailability: totalProviders - providersWithAvailability,
        coveragePercentage: totalProviders > 0 ? (providersWithAvailability / totalProviders) * 100 : 0
      }
    };
  }

  async getServiceManagement(page = 1, limit = 50, category?: string, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status === 'available') {
      query.isAvailable = true;
    } else if (status === 'unavailable') {
      query.isAvailable = false;
    }

    const [services, total] = await Promise.all([
      this.serviceModel
        .find(query)
        .populate('providerId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.serviceModel.countDocuments(query)
    ]);

    // Get service statistics
    const servicesWithStats = await Promise.all(
      services.map(async (service) => {
        const serviceId = service._id.toString();
        const [sessions, revenue, lastBooking] = await Promise.all([
          this.sessionModel.countDocuments({ serviceId: new Types.ObjectId(serviceId) }),
          this.sessionModel.aggregate([
            { 
              $match: { 
                serviceId: new Types.ObjectId(serviceId), 
                status: SessionStatus.COMPLETED 
              } 
            },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
          ]),
          this.sessionModel
            .findOne({ serviceId: new Types.ObjectId(serviceId) })
            .sort({ createdAt: -1 })
            .select('createdAt')
        ]);

        return {
          ...service,
          totalBookings: sessions,
          totalRevenue: revenue[0]?.totalRevenue || 0,
          lastBooked: lastBooking?.createdAt || null
        };
      })
    );

    // Category breakdown
    const categoryBreakdown = await this.serviceModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalRevenue: { $sum: 0 } // Will calculate separately
        }
      }
    ]);

    // Get revenue for each category
    const categoryRevenue = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED } },
      {
        $group: {
          _id: '$category',
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const categoryRevenueMap = {};
    categoryRevenue.forEach(cat => {
      categoryRevenueMap[cat._id] = cat.totalRevenue;
    });

    const categoryStats = {};
    categoryBreakdown.forEach(cat => {
      categoryStats[cat._id] = {
        count: cat.count,
        totalRevenue: categoryRevenueMap[cat._id] || 0
      };
    });

    return {
      services: servicesWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      categoryBreakdown: categoryStats
    };
  }

  async getSessionManagement(
    page = 1, 
    limit = 50, 
    status?: string, 
    dateFrom?: string, 
    dateTo?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.sessionDate = {};
      if (dateFrom) {
        query.sessionDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.sessionDate.$lte = new Date(dateTo);
      }
    }

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(query)
        .populate('seekerId', 'fullName email phoneNumber')
        .populate('providerId', 'fullName email phoneNumber')
        .populate('serviceId', 'title category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.sessionModel.countDocuments(query)
    ]);

    const sessionsWithDetails = sessions.map(session => ({
      ...session,
      platformCommission: session.totalAmount * 0.1,
      providerEarning: session.totalAmount * 0.9
    }));

    return {
      sessions: sessionsWithDetails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getFinancialOverview(period = 'monthly') {
    // Total revenue and commission
    const revenueData = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          sessionCount: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const platformCommission = totalRevenue * 0.1;
    const providerEarnings = totalRevenue * 0.9;

    // Revenue by time period
    let groupByFormat;
    switch (period) {
      case 'daily':
        groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$sessionDate' } };
        break;
      case 'monthly':
      default:
        groupByFormat = { $dateToString: { format: '%Y-%m', date: '$sessionDate' } };
        break;
    }

    const revenueByPeriod = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED } },
      {
        $group: {
          _id: groupByFormat,
          revenue: { $sum: '$totalAmount' },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 } // Last 12 periods
    ]);

    // Revenue by category
    const revenueByCategory = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED } },
      {
        $group: {
          _id: '$category',
          revenue: { $sum: '$totalAmount' },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Top earning providers
    const topEarningProviders = await this.sessionModel.aggregate([
      { $match: { status: SessionStatus.COMPLETED } },
      {
        $group: {
          _id: '$providerId',
          totalEarnings: { $sum: { $multiply: ['$totalAmount', 0.9] } },
          totalSessions: { $sum: 1 }
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 }
    ]);

    const topEarningProvidersWithDetails = await Promise.all(
      topEarningProviders.map(async (provider) => {
        const user = await this.userModel
          .findById(provider._id)
          .select('fullName email');
        
        return {
          providerId: provider._id,
          fullName: user?.fullName || 'Unknown',
          email: user?.email || '',
          totalEarnings: provider.totalEarnings,
          totalSessions: provider.totalSessions
        };
      })
    );

    // Pending payments calculation
    const pendingPayments = await this.sessionModel.aggregate([
      { 
        $match: { 
          status: SessionStatus.COMPLETED,
          // Add any payment processing logic here
        } 
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $multiply: ['$totalAmount', 0.9] } },
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      totalRevenue,
      platformCommission,
      providerEarnings,
      revenueByPeriod: revenueByPeriod.map(item => ({
        period: item._id,
        revenue: item.revenue,
        commission: item.revenue * 0.1,
        sessions: item.sessions
      })),
      revenueByCategory: revenueByCategory.map(cat => ({
        category: cat._id,
        revenue: cat.revenue,
        sessions: cat.sessions
      })),
      topEarningProviders: topEarningProvidersWithDetails,
      pendingPayments: {
        totalAmount: pendingPayments[0]?.totalAmount || 0,
        providerCount: pendingPayments[0]?.count || 0
      }
    };
  }

  async getAnalyticsTrends(period = 'daily', days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Session trends
    const sessionTrends = await this.sessionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sessions: { $sum: 1 },
          revenue: { 
            $sum: {
              $cond: [
                { $eq: ['$status', SessionStatus.COMPLETED] },
                '$totalAmount',
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User growth trends
    const userGrowth = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newUsers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category performance trends
    const categoryPerformance = await this.sessionModel.aggregate([
      {
        $match: {
          status: SessionStatus.COMPLETED,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          sessions: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    return {
      sessionTrends: sessionTrends.map(trend => ({
        date: trend._id,
        sessions: trend.sessions,
        revenue: trend.revenue
      })),
      userGrowth: userGrowth.map(growth => ({
        date: growth._id,
        newUsers: growth.newUsers
      })),
      categoryPerformance: categoryPerformance.reduce((acc, cat) => {
        acc[cat._id] = {
          sessions: cat.sessions,
          revenue: cat.revenue,
          growth: 0, // Calculate growth based on previous period if needed
          trend: cat.revenue > 0 ? 'up' : 'neutral'
        };
        return acc;
      }, {})
    };
  }

  async getReviewsManagement(page = 1, limit = 50, rating?: number, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (rating && rating !== 0) {
      query.rating = rating;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('reviewerId', 'fullName email')
        .populate('providerId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments(query)
    ]);

    // Rating statistics
    const ratingStats = await this.reviewModel.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (ratingStats[0]?.ratingDistribution) {
      ratingStats[0].ratingDistribution.forEach(rating => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
    }

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      ratingStats: {
        averageRating: ratingStats[0]?.averageRating || 0,
        totalReviews: ratingStats[0]?.totalReviews || 0,
        ratingDistribution
      }
    };
  }
}