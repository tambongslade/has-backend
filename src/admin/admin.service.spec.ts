import { AdminService } from './admin.service';
import { UserRole } from '../users/schemas/user.schema';

function createChainableFind<T>(result: T[]) {
  const chain: any = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

describe('AdminService - getDashboardOverview', () => {
  let service: AdminService;

  // Mocks
  const userModel: any = {
    countDocuments: jest.fn(),
    find: jest.fn(),
  };
  const sessionModel: any = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  };
  const serviceModel: any = {
    countDocuments: jest.fn(),
  };
  const walletModel: any = {};
  const transactionModel: any = {
    find: jest.fn(),
  };
  const reviewModel: any = {
    aggregate: jest.fn(),
  };
  const availabilityModel: any = {};

  beforeEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();

    // Counts
    userModel.countDocuments
      .mockResolvedValueOnce(8) // totalUsers
      .mockResolvedValueOnce(4) // totalProviders
      .mockResolvedValueOnce(4) // totalSeekers
      .mockResolvedValueOnce(5) // totalUsersThisMonth
      .mockResolvedValueOnce(4); // totalUsersLastMonth

    serviceModel.countDocuments
      .mockResolvedValueOnce(10) // totalServices
      .mockResolvedValueOnce(7); // totalActiveServices

    sessionModel.countDocuments
      .mockResolvedValueOnce(2) // totalSessions
      .mockResolvedValueOnce(24) // sessionsToday
      .mockResolvedValueOnce(12) // sessionsYesterday
      .mockResolvedValueOnce(2) // sessionsInMonth
      .mockResolvedValueOnce(1) // completedInMonth
      .mockResolvedValueOnce(1) // sessionsPrevMonth
      .mockResolvedValueOnce(0); // completedPrevMonth

    // Revenue aggregates (this month, prev month)
    sessionModel.aggregate
      .mockResolvedValueOnce([{ amount: 3_300_000, count: 2 }])
      .mockResolvedValueOnce([{ amount: 3_050_000, count: 2 }])
      // Category stats
      .mockResolvedValueOnce([
        { _id: 'cleaning', sessions: 42, revenue: 320_000 },
        { _id: 'plumbing', sessions: 30, revenue: 280_000 },
      ])
      // Top providers (earnings and sessions)
      .mockResolvedValueOnce([
        { _id: 'prov1', earnings: 450_000, sessions: 45 },
        { _id: 'prov2', earnings: 380_000, sessions: 38 },
        { _id: 'prov3', earnings: 320_000, sessions: 42 },
      ])
      // Revenue analytics (12 periods max)
      .mockResolvedValueOnce([
        { _id: '2025-01', revenue: 100_000, sessions: 10 },
        { _id: '2025-02', revenue: 200_000, sessions: 20 },
      ]);

    // Active providers (this month and prev month) via separate aggregates counted in service
    // We simulate those with countDocuments above, not via aggregate.

    // Average rating current and prev month
    reviewModel.aggregate
      .mockResolvedValueOnce([{ avg: 4.8 }])
      .mockResolvedValueOnce([{ avg: 4.6 }]);

    // Top provider users lookup
    userModel.find.mockReturnValue(
      createChainableFind([
        { _id: 'prov1', fullName: 'Kemi Tangio', role: UserRole.PROVIDER },
        { _id: 'prov2', fullName: 'Laurent Brown', role: UserRole.PROVIDER },
        { _id: 'prov3', fullName: 'Adams Brown', role: UserRole.PROVIDER },
      ]),
    );

    // Recent activity chains
    sessionModel.find
      // recentSessions
      .mockReturnValueOnce(
        createChainableFind([
          { serviceName: 'Plumbing', createdAt: new Date() } as any,
        ]),
      )
      // recentCompletedSessions
      .mockReturnValueOnce(
        createChainableFind([
          { serviceName: 'Cleaning', updatedAt: new Date() } as any,
        ]),
      );
    userModel.find
      // recentProviders (chained after previous .find mock used for top providers)
      .mockReturnValueOnce(
        createChainableFind([
          { fullName: 'New Electrician', createdAt: new Date(), role: UserRole.PROVIDER } as any,
        ]),
      );
    transactionModel.find.mockReturnValue(
      createChainableFind([
        { transactionReference: 'PAE099', amount: 45_000, createdAt: new Date() } as any,
      ]),
    );

    service = new AdminService(
      userModel,
      sessionModel,
      {} as any, // serviceModel is only used for counts above; provided via serviceModel mock
      {} as any,
      transactionModel,
      reviewModel,
      {} as any,
    );
    // Note: We injected {} for serviceModel and wallet/availability where not needed directly,
    // since we already bound their methods via direct mocks above.
    (service as any).serviceModel = serviceModel;
  });

  it('returns key metrics with FCFA sums and expected structure', async () => {
    const result = await service.getDashboardOverview();

    // Sessions Today
    expect(result.sessionsToday.count).toBe(24);
    expect(typeof result.sessionsToday.changePct).toBe('number');

    // Total Revenue This Month (FCFA)
    expect(result.totalRevenueThisMonth.amount).toBe(3_300_000);
    expect(result.totalRevenueThisMonth.currency).toBe('FCFA');

    // Users
    expect(result.totalUsers.count).toBe(8);
    expect(typeof result.totalUsers.growthPct).toBe('number');
    expect(typeof result.activeUsersThisMonth.count).toBe('number');

    // Platform earnings
    expect(result.platformEarningsThisMonth.amount).toBeCloseTo(330_000);
    expect(typeof result.platformEarningsThisMonth.changePct).toBe('number');

    // Completion rate
    expect(result.completionRate.valuePct).toBeGreaterThanOrEqual(0);
    expect(typeof result.completionRate.changePct).toBe('number');

    // Totals and providers
    expect(result.totalSessionsThisMonth.count).toBe(2);
    expect(result.activeProviders.count).toBe(4);

    // Ratings
    expect(result.averageRating.value).toBe(4.8);

    // Revenue analytics and categories
    expect(Array.isArray(result.revenueAnalytics)).toBe(true);
    expect(result.revenueAnalytics.length).toBeGreaterThan(0);
    expect(Array.isArray(result.serviceCategories)).toBe(true);

    // Top providers
    expect(Array.isArray(result.topProviders)).toBe(true);
    expect(result.topProviders.length).toBeGreaterThan(0);
    expect(result.topProviders[0]).toHaveProperty('fullName');

    // Recent activity
    expect(Array.isArray(result.recentActivity)).toBe(true);
    expect(result.recentActivity.length).toBeGreaterThan(0);
  });
});

