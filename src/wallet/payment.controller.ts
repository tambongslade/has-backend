import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Request,
  HttpCode,
  BadRequestException,
  Headers,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  PaymentStatusDto,
} from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentProvider, PaymentStatus } from './schemas/payment.schema';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate payment for booking',
    description: 'Initiate MTN Money or Orange Money payment for a booking',
  })
  @ApiBody({
    type: CreatePaymentDto,
    description: 'Payment initiation details',
    examples: {
      mtn_payment: {
        summary: 'MTN Money Payment',
        value: {
          bookingId: '507f1f77bcf86cd799439011',
          amount: 25000,
          provider: 'mtn_money',
          phoneNumber: '+237670123456',
          accountName: 'John Doe',
          description: 'Payment for house cleaning service',
        },
      },
      orange_payment: {
        summary: 'Orange Money Payment',
        value: {
          bookingId: '507f1f77bcf86cd799439012',
          amount: 15000,
          provider: 'orange_money',
          phoneNumber: '+237650987654',
          accountName: 'Jane Smith',
          description: 'Payment for plumbing service',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment initiated successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment details or booking already paid',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Payment already in progress',
  })
  async initiatePayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.initiatePayment(createPaymentDto, req.user.id);
  }

  @Get('status/:paymentReference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Get the current status of a payment by reference ID',
  })
  @ApiParam({
    name: 'paymentReference',
    description: 'Payment reference ID',
    example: 'PAY-1641234567890-ABC123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status retrieved successfully',
    type: PaymentStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async getPaymentStatus(
    @Param('paymentReference') paymentReference: string,
  ): Promise<PaymentStatusDto> {
    return this.paymentService.getPaymentStatus(paymentReference);
  }

  @Post('cancel/:paymentReference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel payment',
    description: 'Cancel a pending or processing payment',
  })
  @ApiParam({
    name: 'paymentReference',
    description: 'Payment reference ID',
    example: 'PAY-1641234567890-ABC123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment cancelled successfully',
    type: PaymentStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment cannot be cancelled in its current state',
  })
  async cancelPayment(
    @Param('paymentReference') paymentReference: string,
    @Request() req: any,
  ): Promise<PaymentStatusDto> {
    return this.paymentService.cancelPayment(paymentReference, req.user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment history',
    description: 'Get payment history for the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 50)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by payment status',
    example: PaymentStatus.SUCCESSFUL,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: PaymentStatus,
  ) {
    const validatedLimit = Math.min(Number(limit), 50);
    return this.paymentService.getPaymentHistory(
      req.user.id,
      Number(page),
      validatedLimit,
      status,
    );
  }

  // Webhook endpoints for payment providers
  @Post('webhook/mtn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'MTN Mobile Money webhook',
    description: 'Webhook endpoint for MTN Mobile Money payment notifications',
  })
  @ApiHeader({
    name: 'X-MTN-Signature',
    description: 'MTN webhook signature for verification',
    required: false,
  })
  @ApiBody({
    description: 'MTN webhook payload',
    examples: {
      success: {
        summary: 'Successful Payment',
        value: {
          financialTransactionId: '1234567890',
          externalId: 'PAY-1641234567890-ABC123',
          amount: '25000',
          currency: 'EUR',
          payer: {
            partyIdType: 'MSISDN',
            partyId: '237670123456',
          },
          status: 'SUCCESSFUL',
          reason: 'Payment completed successfully',
        },
      },
      failed: {
        summary: 'Failed Payment',
        value: {
          financialTransactionId: '1234567891',
          externalId: 'PAY-1641234567890-ABC124',
          amount: '25000',
          currency: 'EUR',
          payer: {
            partyIdType: 'MSISDN',
            partyId: '237670123456',
          },
          status: 'FAILED',
          reason: 'Insufficient balance',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook payload',
  })
  async handleMTNWebhook(
    @Body() payload: any,
    @Headers('x-mtn-signature') signature?: string,
  ): Promise<{ message: string }> {
    this.logger.log('Received MTN webhook', { payload, signature });

    try {
      await this.paymentService.handleWebhook(
        PaymentProvider.MTN_MONEY,
        payload,
      );
      return { message: 'Webhook processed successfully' };
    } catch (error: any) {
      this.logger.error('MTN webhook processing failed', error.stack);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('webhook/orange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Orange Money webhook',
    description: 'Webhook endpoint for Orange Money payment notifications',
  })
  @ApiHeader({
    name: 'X-Orange-Signature',
    description: 'Orange webhook signature for verification',
    required: false,
  })
  @ApiBody({
    description: 'Orange webhook payload',
    examples: {
      success: {
        summary: 'Successful Payment',
        value: {
          order_id: 'PAY-1641234567890-ABC123',
          amount: 25000,
          currency: 'XAF',
          status: 'SUCCESS',
          transaction_id: 'OM123456789',
          phone: '237650987654',
          message: 'Payment completed successfully',
        },
      },
      failed: {
        summary: 'Failed Payment',
        value: {
          order_id: 'PAY-1641234567890-ABC124',
          amount: 25000,
          currency: 'XAF',
          status: 'FAILED',
          transaction_id: 'OM123456790',
          phone: '237650987654',
          message: 'Payment failed due to insufficient balance',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook payload',
  })
  async handleOrangeWebhook(
    @Body() payload: any,
    @Headers('x-orange-signature') signature?: string,
  ): Promise<{ message: string }> {
    this.logger.log('Received Orange webhook', { payload, signature });

    try {
      await this.paymentService.handleWebhook(
        PaymentProvider.ORANGE_MONEY,
        payload,
      );
      return { message: 'Webhook processed successfully' };
    } catch (error: any) {
      this.logger.error('Orange webhook processing failed', error.stack);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  // Admin endpoints (can be added later for payment management)
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment statistics',
    description:
      'Get payment statistics for admin dashboard (requires admin role)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics retrieved successfully',
  })
  async getPaymentStats(@Request() req: any) {
    // TODO: Add admin role guard and implement stats logic
    return {
      message: 'Payment statistics endpoint - implementation pending',
      note: 'This endpoint will be available for admin users to view payment analytics',
    };
  }
}
