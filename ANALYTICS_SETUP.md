# Analytics Dashboard Setup Guide

## Option 1: AdminJS (Recommended for Quick Setup)

### Installation
```bash
npm install @adminjs/nestjs @adminjs/mongoose @adminjs/express @adminjs/upload
npm install --save-dev @types/multer
```

### Basic Setup

1. **Create Admin Module**
```typescript
// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { Database, Resource } from '@adminjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { Payment } from '../wallet/schemas/payment.schema';
import { ProviderReview } from '../users/schemas/provider-review.schema';
import { Service } from '../services/schemas/service.schema';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    AdminModule.createAdminAsync({
      useFactory: () => ({
        adminJsOptions: {
          rootPath: '/admin',
          resources: [
            {
              resource: User,
              options: {
                navigation: { name: 'User Management', icon: 'User' },
                listProperties: ['fullName', 'email', 'role', 'createdAt'],
                showProperties: ['fullName', 'email', 'phoneNumber', 'role', 'location', 'createdAt'],
              },
            },
            {
              resource: Booking,
              options: {
                navigation: { name: 'Bookings', icon: 'Calendar' },
                listProperties: ['seekerId', 'providerId', 'status', 'paymentStatus', 'totalAmount', 'bookingDate'],
                properties: {
                  totalAmount: { type: 'currency' },
                  bookingDate: { type: 'datetime' },
                },
              },
            },
            {
              resource: Payment,
              options: {
                navigation: { name: 'Payments', icon: 'CreditCard' },
                listProperties: ['paymentReference', 'amount', 'provider', 'status', 'createdAt'],
                properties: {
                  amount: { type: 'currency' },
                },
              },
            },
            {
              resource: ProviderReview,
              options: {
                navigation: { name: 'Reviews', icon: 'Star' },
                listProperties: ['providerId', 'rating', 'comment', 'status', 'createdAt'],
              },
            },
            {
              resource: Service,
              options: {
                navigation: { name: 'Services', icon: 'Settings' },
                listProperties: ['title', 'category', 'pricePerHour', 'isAvailable', 'averageRating'],
                properties: {
                  pricePerHour: { type: 'currency' },
                },
              },
            },
          ],
          dashboard: {
            component: AdminJS.bundle('./dashboard-component'),
          },
          branding: {
            companyName: 'HAS - House Service Platform',
            logo: '/assets/logo.png',
            softwareBrothers: false,
          },
        },
        auth: {
          authenticate: async (email: string, password: string) => {
            // Simple auth - replace with your user authentication
            if (email === 'admin@has.com' && password === 'admin123') {
              return { email: 'admin@has.com', role: 'admin' };
            }
            return null;
          },
          cookieName: 'adminjs',
          cookiePassword: 'secret-password-change-in-production',
        },
      }),
    }),
  ],
})
export class AdminPanelModule {}
```

2. **Add to App Module**
```typescript
// src/app.module.ts
import { AdminPanelModule } from './admin/admin.module';

@Module({
  imports: [
    // ... existing imports
    AdminPanelModule,
  ],
  // ...
})
export class AppModule {}
```

3. **Custom Dashboard Component**
```jsx
// src/admin/dashboard-component.tsx
import React, { useEffect, useState } from 'react';
import { Box, H2, H5, Text, Illustration } from '@adminjs/design-system';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeProviders: 0,
  });

  useEffect(() => {
    // Fetch dashboard stats from your API
    fetch('/api/v1/admin/dashboard-stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <Box>
      <H2>HAS Platform Analytics</H2>
      
      <Box display="flex" flexDirection="row" gap="lg" mb="xl">
        <Box bg="white" p="lg" border="default" borderRadius="default" flex="1">
          <H5 color="primary100">Total Users</H5>
          <Text fontSize="2xl" fontWeight="bold">{stats.totalUsers}</Text>
        </Box>
        
        <Box bg="white" p="lg" border="default" borderRadius="default" flex="1">
          <H5 color="primary100">Total Bookings</H5>
          <Text fontSize="2xl" fontWeight="bold">{stats.totalBookings}</Text>
        </Box>
        
        <Box bg="white" p="lg" border="default" borderRadius="default" flex="1">
          <H5 color="primary100">Total Revenue</H5>
          <Text fontSize="2xl" fontWeight="bold">{stats.totalRevenue} FCFA</Text>
        </Box>
        
        <Box bg="white" p="lg" border="default" borderRadius="default" flex="1">
          <H5 color="primary100">Active Providers</H5>
          <Text fontSize="2xl" fontWeight="bold">{stats.activeProviders}</Text>
        </Box>
      </Box>

      <Illustration variant="Astronaut" />
    </Box>
  );
};

export default Dashboard;
```

## Option 2: Custom Analytics API + Frontend

### Backend Analytics Endpoints

```typescript
// src/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  async getRevenueAnalytics(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.analyticsService.getRevenueAnalytics(period);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get booking analytics' })
  async getBookingAnalytics(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.analyticsService.getBookingAnalytics(period);
  }

  @Get('top-providers')
  @ApiOperation({ summary: 'Get top performing providers' })
  async getTopProviders(@Query('limit') limit: number = 10) {
    return this.analyticsService.getTopProviders(limit);
  }

  @Get('service-categories')
  @ApiOperation({ summary: 'Get service category statistics' })
  async getServiceCategoryStats() {
    return this.analyticsService.getServiceCategoryStats();
  }
}
```

```typescript
// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Payment, PaymentDocument } from '../wallet/schemas/payment.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalProviders,
      totalBookings,
      completedBookings,
      totalRevenue,
      recentBookings,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: 'PROVIDER' }),
      this.bookingModel.countDocuments(),
      this.bookingModel.countDocuments({ status: 'completed' }),
      this.paymentModel.aggregate([
        { $match: { status: 'successful' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.bookingModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return {
      totalUsers,
      totalProviders,
      totalBookings,
      completedBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentBookings,
      conversionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(2) : 0,
    };
  }

  async getRevenueAnalytics(period: string) {
    const groupBy = this.getGroupByPeriod(period);
    
    const revenueData = await this.paymentModel.aggregate([
      { $match: { status: 'successful' } },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      period,
      data: revenueData,
      totalRevenue: revenueData.reduce((sum, item) => sum + item.revenue, 0),
      totalTransactions: revenueData.reduce((sum, item) => sum + item.count, 0),
    };
  }

  async getBookingAnalytics(period: string) {
    const groupBy = this.getGroupByPeriod(period);
    
    const bookingData = await this.bookingModel.aggregate([
      {
        $group: {
          _id: {
            period: groupBy,
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]);

    return {
      period,
      data: bookingData,
    };
  }

  async getTopProviders(limit: number) {
    return this.bookingModel.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$providerId',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageRating: { $avg: '$seekerRating' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'provider',
        },
      },
      { $unwind: '$provider' },
      {
        $project: {
          providerName: '$provider.fullName',
          totalBookings: 1,
          totalRevenue: 1,
          averageRating: { $round: ['$averageRating', 2] },
        },
      },
    ]);
  }

  private getGroupByPeriod(period: string) {
    switch (period) {
      case 'day':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
      case 'week':
        return {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
      case 'month':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
      case 'year':
        return { year: { $year: '$createdAt' } };
      default:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
    }
  }
}
```

## Option 3: Grafana + InfluxDB (Advanced Metrics)

```typescript
// src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

@Injectable()
export class MetricsService {
  private influxDB: InfluxDB;
  private writeApi: any;

  constructor() {
    this.influxDB = new InfluxDB({
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN,
    });
    this.writeApi = this.influxDB.getWriteApi('has', 'analytics');
  }

  async recordPayment(amount: number, provider: string, status: string) {
    const point = new Point('payment')
      .tag('provider', provider)
      .tag('status', status)
      .floatField('amount', amount)
      .timestamp(new Date());

    this.writeApi.writePoint(point);
    await this.writeApi.flush();
  }

  async recordBooking(category: string, status: string, amount: number) {
    const point = new Point('booking')
      .tag('category', category)
      .tag('status', status)
      .floatField('amount', amount)
      .timestamp(new Date());

    this.writeApi.writePoint(point);
    await this.writeApi.flush();
  }
}
```

## 🎯 **My Recommendation**

For your HAS backend, I recommend **AdminJS** because:

1. **Zero Configuration** - Works with your existing schemas
2. **Instant Dashboard** - Analytics and CRUD in one package  
3. **Authentication Ready** - Built-in admin authentication
4. **MongoDB Compatible** - Perfect for your Mongoose setup
5. **Customizable** - Add custom charts and widgets
6. **Production Ready** - Used by thousands of applications

Would you like me to implement AdminJS for your backend? It would give you an instant admin dashboard with analytics for users, bookings, payments, and reviews!