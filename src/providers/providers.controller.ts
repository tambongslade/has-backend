import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

// Services
import { ProviderDashboardService } from './services/provider-dashboard.service';
import { EarningsAnalyticsService } from './services/earnings-analytics.service';
import { WithdrawalManagementService } from './services/withdrawal-management.service';
import { ProviderAnalyticsService } from './services/provider-analytics.service';
import { UpcomingBookingsService } from './services/upcoming-bookings.service';

// DTOs
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { EarningsQueryDto, EarningsSummaryDto } from './dto/earnings.dto';
import { WalletInfoDto } from './dto/wallet.dto';
import {
  WithdrawalRequestDto,
  WithdrawalResponseDto,
  WithdrawalQueryDto,
  WithdrawalHistoryDto,
} from './dto/withdrawal.dto';
import { AnalyticsQueryDto, AnalyticsDto } from './dto/analytics.dto';
import {
  UpcomingBookingsQueryDto,
  UpcomingBookingsDto,
} from './dto/upcoming-bookings.dto';

@ApiTags('Provider Dashboard')
@Controller('providers')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.PROVIDER)
@ApiBearerAuth()
export class ProvidersController {
  constructor(
    private readonly dashboardService: ProviderDashboardService,
    private readonly earningsService: EarningsAnalyticsService,
    private readonly withdrawalService: WithdrawalManagementService,
    private readonly analyticsService: ProviderAnalyticsService,
    private readonly upcomingBookingsService: UpcomingBookingsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get provider dashboard summary' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryDto,
  })
  async getDashboardSummary(@Request() req): Promise<DashboardSummaryDto> {
    return this.dashboardService.getDashboardSummary(req.user.sub);
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get earnings summary and analytics' })
  @ApiResponse({
    status: 200,
    description: 'Earnings summary retrieved successfully',
    type: EarningsSummaryDto,
  })
  async getEarningsSummary(
    @Query() query: EarningsQueryDto,
    @Request() req,
  ): Promise<EarningsSummaryDto> {
    return this.earningsService.getEarningsSummary(req.user.sub, query);
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet information and recent transactions' })
  @ApiResponse({
    status: 200,
    description: 'Wallet information retrieved successfully',
    type: WalletInfoDto,
  })
  async getWalletInfo(@Request() req): Promise<WalletInfoDto> {
    return this.getWalletData(req.user.sub);
  }

  @Post('withdrawals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a withdrawal' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid withdrawal request' })
  async requestWithdrawal(
    @Body() dto: WithdrawalRequestDto,
    @Request() req,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.requestWithdrawal(req.user.sub, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawal history' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal history retrieved successfully',
    type: WithdrawalHistoryDto,
  })
  async getWithdrawalHistory(
    @Query() query: WithdrawalQueryDto,
    @Request() req,
  ): Promise<WithdrawalHistoryDto> {
    return this.withdrawalService.getWithdrawalHistory(req.user.sub, query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get provider analytics and performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    type: AnalyticsDto,
  })
  async getAnalytics(
    @Query() query: AnalyticsQueryDto,
    @Request() req,
  ): Promise<AnalyticsDto> {
    return this.analyticsService.getAnalytics(req.user.sub, query);
  }

  @Get('bookings/upcoming')
  @ApiOperation({ summary: 'Get upcoming bookings' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming bookings retrieved successfully',
    type: UpcomingBookingsDto,
  })
  async getUpcomingBookings(
    @Query() query: UpcomingBookingsQueryDto,
    @Request() req,
  ): Promise<UpcomingBookingsDto> {
    return this.upcomingBookingsService.getUpcomingBookings(
      req.user.sub,
      query,
    );
  }

  // Helper method to get wallet data
  private async getWalletData(providerId: string): Promise<WalletInfoDto> {
    // This would integrate with the existing wallet service
    // For now, returning mock data structure that matches the DTO
    return {
      balance: {
        available: 0,
        pending: 0,
        total: 0,
        currency: 'FCFA',
      },
      recentTransactions: [],
    };
  }
}
