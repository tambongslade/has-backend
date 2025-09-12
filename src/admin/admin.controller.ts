import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Patch,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/admin-auth.dto';
import {
  ApproveProviderDto,
  RejectProviderDto,
  UpdateProviderStatusDto,
  ProviderValidationResponseDto,
  PendingProvidersResponseDto,
  ProviderValidationDetailsDto,
} from './dto/provider-validation.dto';

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
    return this.adminService.getServiceManagement(
      page,
      limit,
      category,
      status,
    );
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
    enum: [
      'all',
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'rejected',
    ],
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
    return this.adminService.getSessionManagement(
      page,
      limit,
      status,
      dateFrom,
      dateTo,
    );
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

  @Get('providers/pending')
  @ApiOperation({
    summary: 'Get pending providers for approval',
    description: 'Get paginated list of providers waiting for admin approval',
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
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Pending providers retrieved successfully',
    type: PendingProvidersResponseDto,
  })
  async getPendingProviders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PendingProvidersResponseDto> {
    return this.adminService.getPendingProviders(page, limit);
  }

  @Get('providers/:id')
  @ApiOperation({
    summary: 'Get provider details for review',
    description: 'Get detailed provider information for approval review',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider details retrieved successfully',
    type: ProviderValidationDetailsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  async getProviderForReview(@Param('id') providerId: string): Promise<ProviderValidationDetailsDto> {
    return this.adminService.getProviderForReview(providerId);
  }

  @Patch('providers/:id/approve')
  @ApiOperation({
    summary: 'Approve a provider',
    description: 'Approve a provider and change their status to active',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiBody({
    type: ApproveProviderDto,
    description: 'Approval details',
    examples: {
      example1: {
        summary: 'Approve provider',
        value: {
          adminNotes: 'Profile reviewed and approved. All requirements met.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Provider approved successfully',
    type: ProviderValidationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Provider cannot be approved (invalid status)',
  })
  async approveProvider(
    @Param('id') providerId: string,
    @Body() approveDto: ApproveProviderDto,
    @Request() req: any,
  ): Promise<ProviderValidationResponseDto> {
    return this.adminService.approveProvider(providerId, req.user.id, approveDto);
  }

  @Patch('providers/:id/reject')
  @ApiOperation({
    summary: 'Reject a provider',
    description: 'Reject a provider and change their status to inactive',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiBody({
    type: RejectProviderDto,
    description: 'Rejection details',
    examples: {
      example1: {
        summary: 'Reject provider',
        value: {
          rejectionReason: 'Incomplete certifications. Please provide valid professional certifications.',
          adminNotes: 'Reviewed on 2024-12-16. Missing required certifications.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Provider rejected successfully',
    type: ProviderValidationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Provider cannot be rejected (invalid status)',
  })
  async rejectProvider(
    @Param('id') providerId: string,
    @Body() rejectDto: RejectProviderDto,
    @Request() req: any,
  ): Promise<ProviderValidationResponseDto> {
    return this.adminService.rejectProvider(providerId, req.user.id, rejectDto);
  }

  @Patch('providers/:id/status')
  @ApiOperation({
    summary: 'Update provider status',
    description: 'Update provider status (suspend, reactivate, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiBody({
    type: UpdateProviderStatusDto,
    description: 'Status update details',
    examples: {
      example1: {
        summary: 'Suspend provider',
        value: {
          status: 'suspended',
          reason: 'Policy violations reported by multiple users.',
          adminNotes: 'Suspended pending investigation.',
        },
      },
      example2: {
        summary: 'Reactivate provider',
        value: {
          status: 'active',
          reason: 'Investigation completed. Provider cleared.',
          adminNotes: 'Reactivated after successful appeal.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Provider status updated successfully',
    type: ProviderValidationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  async updateProviderStatus(
    @Param('id') providerId: string,
    @Body() updateStatusDto: UpdateProviderStatusDto,
    @Request() req: any,
  ): Promise<ProviderValidationResponseDto> {
    return this.adminService.updateProviderStatus(providerId, req.user.id, updateStatusDto);
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
    description:
      'Get system activity logs (placeholder for future implementation)',
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
