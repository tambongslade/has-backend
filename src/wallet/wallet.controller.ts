import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import {
  WalletResponseDto,
  TransactionResponseDto,
} from './dto/wallet-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get provider wallet balance and summary' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    type: WalletResponseDto,
  })
  async getBalance(@Request() req): Promise<WalletResponseDto> {
    const wallet = await this.walletService.getWalletBalance(req.user.userId);

    return {
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      totalEarnings: wallet.totalEarnings,
      totalWithdrawn: wallet.totalWithdrawn,
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get provider earnings history' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings history retrieved successfully',
  })
  async getEarningsHistory(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.walletService.getEarningsHistory(
      req.user.userId,
      page,
      limit,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transaction history' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
  })
  async getTransactionHistory(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.walletService.getTransactionHistory(
      req.user.userId,
      page,
      limit,
    );
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawal history' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal history retrieved successfully',
  })
  async getWithdrawalHistory(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.walletService.getWithdrawalHistory(
      req.user.userId,
      page,
      limit,
    );
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Create a withdrawal request' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - insufficient balance or invalid data',
  })
  async createWithdrawal(
    @Request() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.walletService.createWithdrawal(
      req.user.userId,
      createWithdrawalDto,
    );

    const transactionDoc = transaction.toObject();

    return {
      id: transaction._id?.toString() || '',
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      withdrawalMethod: transaction.withdrawalMethod,
      transactionReference: transaction.transactionReference,
      createdAt: transactionDoc.createdAt,
      processedAt: transaction.processedAt,
    };
  }
}
