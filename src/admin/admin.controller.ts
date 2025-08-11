import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Patch,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/admin-auth.dto';

@ApiTags('Admin Dashboard')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('users/status')
  @ApiOperation({ summary: 'Update user active status' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(@Body() body: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(body.userId, body.isActive);
  }

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get dashboard overview statistics',
    description: 'Get key metrics and statistics for the admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        totalProviders: { type: 'number' },
        totalSeekers: { type: 'number' },
        totalServices: { type: 'number' },
        totalSessions: { type: 'number' },
        totalRevenue: { type: 'number' },
        platformCommission: { type: 'number' },
        revenueToday: { type: 'number' },
        newUsersToday: { type: 'number' },
        newSessionsToday: { type: 'number' },
        sessionStats: {
          type: 'object',
          properties: {
            pending: { type: 'number' },
            confirmed: { type: 'number' },
            inProgress: { type: 'number' },
            completed: { type: 'number' },
            cancelled: { type: 'number' },
            rejected: { type: 'number' },
          },
        },
        categoryStats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              sessions: { type: 'number' },
              revenue: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get user management data',
    description: 'Get paginated list of users with statistics',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 50,
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by user role',
    enum: ['all', 'seeker', 'provider'],
    example: 'all',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by user status',
    enum: ['all', 'active', 'inactive'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getUserManagement(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUserManagement(page, limit, role, status);
  }

  @Get('providers/analytics')
  @ApiOperation({
    summary: 'Get provider analytics',
    description: 'Get analytics and performance data for providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider analytics retrieved successfully',
  })
  async getProviderAnalytics() {
    return this.adminService.getProviderAnalytics();
  }

  @Get('services')
  @ApiOperation({
    summary: 'Get service management data',
    description: 'Get paginated list of services with statistics',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 50,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by service category',
    example: 'cleaning',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by service status',
    enum: ['all', 'available', 'unavailable'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
  })
  async getServiceManagement(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getServiceManagement(page, limit, category, status);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get session management data',
    description: 'Get paginated list of sessions with details',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 50,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by session status',
    enum: ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'],
    example: 'all',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Filter sessions from date (YYYY-MM-DD)',
    example: '2025-08-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Filter sessions to date (YYYY-MM-DD)',
    example: '2025-08-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  async getSessionManagement(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.adminService.getSessionManagement(page, limit, status, dateFrom, dateTo);
  }

  @Get('financials/overview')
  @ApiOperation({
    summary: 'Get financial overview',
    description: 'Get comprehensive financial data and analytics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description: 'Time period for grouping',
    enum: ['daily', 'monthly'],
    example: 'monthly',
  })
  @ApiResponse({
    status: 200,
    description: 'Financial overview retrieved successfully',
  })
  async getFinancialOverview(@Query('period') period?: string) {
    return this.adminService.getFinancialOverview(period);
  }

  @Get('analytics/trends')
  @ApiOperation({
    summary: 'Get analytics trends',
    description: 'Get time-series data for analytics and reporting',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description: 'Time period granularity',
    enum: ['daily', 'weekly', 'monthly'],
    example: 'daily',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics trends retrieved successfully',
  })
  async getAnalyticsTrends(
    @Query('period') period?: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    return this.adminService.getAnalyticsTrends(period, days);
  }

  @Get('reviews')
  @ApiOperation({
    summary: 'Get reviews management data',
    description: 'Get paginated list of reviews with moderation capabilities',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 50,
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    description: 'Filter by rating',
    enum: [0, 1, 2, 3, 4, 5],
    example: 0,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by review status',
    enum: ['all', 'active', 'flagged', 'hidden'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  async getReviewsManagement(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('rating', new DefaultValuePipe(0), ParseIntPipe) rating?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReviewsManagement(page, limit, rating, status);
  }

  @Get('system/health')
  @ApiOperation({
    summary: 'Get system health status',
    description: 'Get basic system health and status information',
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth() {
    return {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0',
      database: 'connected',
      services: {
        sessions: 'active',
        payments: 'active',
        notifications: 'active',
      },
      uptime: process.uptime(),
    };
  }

  @Get('logs/activity')
  @ApiOperation({
    summary: 'Get activity logs',
    description: 'Get system activity logs (placeholder for future implementation)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 100,
  })
  @ApiQuery({
    name: 'level',
    required: false,
    type: String,
    description: 'Log level filter',
    enum: ['all', 'info', 'warn', 'error'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  async getActivityLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('level') level?: string,
  ) {
    // Placeholder implementation - in production, this would integrate with logging service
    return {
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          action: 'session_created',
          userId: 'example_user_id',
          details: {
            sessionId: 'example_session_id',
            amount: 3000,
            category: 'cleaning',
          },
        },
      ],
      pagination: {
        total: 1,
        page,
        limit,
        totalPages: 1,
      },
    };
  }
}