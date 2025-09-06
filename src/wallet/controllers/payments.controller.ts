import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
  Headers,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// Remove unused import - using @Req() instead
import { FapshiService } from '../services/fapshi.service';
import { PaymentsService } from '../services/payments.service';
import { SessionsService } from '../../bookings/sessions.service';
import {
  CreatePaymentLinkDto,
  PaymentLinkResponseDto,
} from '../dto/create-payment-link.dto';
import { FapshiWebhookPayloadDto } from '../dto/webhook-payload.dto';
import { PaymentProvider, PaymentStatus } from '../schemas/payment.schema';
import { Request } from 'express';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly fapshiService: FapshiService,
    private readonly paymentsService: PaymentsService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post('create-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a payment link for a booking',
    description: 'Creates a Fapshi payment link for the specified booking',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment link created successfully',
    type: PaymentLinkResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid booking or payment data' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async createPaymentLink(
    @Body() createPaymentLinkDto: CreatePaymentLinkDto,
    @Req() req: any,
  ): Promise<PaymentLinkResponseDto> {
    try {
      // Get the session details
      const session = await this.sessionsService.findOne(
        createPaymentLinkDto.sessionId,
      );

      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      // Verify user can pay for this session (seeker or provider)
      const seekerIdStr = session.seekerId.toString();
      const providerIdStr = session.providerId?.toString();
      const userIdStr = req.user.id.toString();

      if (seekerIdStr !== userIdStr && providerIdStr !== userIdStr) {
        throw new HttpException(
          'You are not authorized to pay for this session',
          HttpStatus.FORBIDDEN,
        );
      }

      // Check if payment already exists and is not failed/expired
      const existingPayment = await this.paymentsService.findBySessionId(
        session.id,
      );
      if (
        existingPayment &&
        ['pending', 'processing', 'successful'].includes(existingPayment.status)
      ) {
        throw new HttpException(
          'Payment already exists for this session',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate amount
      const amount = session.totalAmount;
      const minAmount = this.fapshiService.getMinimumAmount();
      if (amount < minAmount) {
        throw new HttpException(
          `Amount must be at least ${minAmount} FCFA`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generate external ID
      const externalId = this.fapshiService.generateExternalId(session.id);

      // Create payment record first
      const paymentReference = `HAS_PAY_${Date.now()}`;
      const payment = await this.paymentsService.create({
        payerId: req.user.id,
        receiverId: session.providerId!.toString(),
        sessionId: session.id,
        amount: amount,
        currency: this.fapshiService.getCurrency(),
        provider: PaymentProvider.FAPSHI,
        status: PaymentStatus.PENDING,
        paymentType: 'booking_payment',
        paymentDetails: {
          phoneNumber:
            createPaymentLinkDto.customerPhone || req.user.phoneNumber || '',
          accountName: req.user.fullName,
          country: 'CM',
          countryCode: 'CM',
        },
        providerMetadata: {
          fapshiExternalId: externalId,
          webhookUrl: this.fapshiService['webhookUrl'],
        },
        paymentReference,
        description: `Payment for ${session.serviceName || 'service'} session`,
      });

      // Create payment link with Fapshi
      const paymentLinkResponse = await this.fapshiService.createPaymentLink({
        amount,
        description: `Payment for session ${session.id}`,
        externalId,
        redirectUrl: createPaymentLinkDto.redirectUrl,
        customerEmail: createPaymentLinkDto.customerEmail || req.user.email,
        customerPhone:
          createPaymentLinkDto.customerPhone || req.user.phoneNumber,
      });

      // Update payment with Fapshi details
      await this.paymentsService.updateProviderMetadata(payment.id, {
        ...payment.providerMetadata,
        fapshiPaymentId: paymentLinkResponse.data.paymentId,
        fapshiPaymentUrl: paymentLinkResponse.data.paymentUrl,
        apiResponse: paymentLinkResponse,
      });

      this.logger.log(`Payment link created for session ${session.id}`, {
        paymentId: paymentLinkResponse.data.paymentId,
        amount,
        externalId,
      });

      return {
        paymentId: paymentLinkResponse.data.paymentId,
        paymentUrl: paymentLinkResponse.data.paymentUrl,
        amount: paymentLinkResponse.data.amount,
        currency: paymentLinkResponse.data.currency,
        externalId: paymentLinkResponse.data.externalId,
        paymentReference,
      };
    } catch (error) {
      this.logger.error('Failed to create payment link', {
        sessionId: createPaymentLinkDto.sessionId,
        userId: req.user.id,
        error: error.message,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create payment link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Check the current status of a payment',
  })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(
    @Param('paymentId') paymentId: string,
    @Req() req: any,
  ) {
    try {
      // Find payment by Fapshi payment ID
      const payment =
        await this.paymentsService.findByProviderPaymentId(paymentId);

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      // Verify user can access this payment
      const payerIdStr = payment.payerId.toString();
      const receiverIdStr = payment.receiverId.toString();
      const userIdStr = req.user.id.toString();

      if (payerIdStr !== userIdStr && receiverIdStr !== userIdStr) {
        throw new HttpException(
          'You are not authorized to view this payment',
          HttpStatus.FORBIDDEN,
        );
      }

      // Get latest status from Fapshi
      const statusResponse =
        await this.fapshiService.getPaymentStatus(paymentId);

      // Update payment status if it has changed
      const newStatus = this.mapFapshiStatusToPaymentStatus(
        statusResponse.data.status,
      );
      if (payment.status !== newStatus) {
        await this.paymentsService.updateStatus(payment.id, newStatus);

        // Update session status if payment is successful
        if (newStatus === PaymentStatus.SUCCESSFUL) {
          await this.sessionsService.updatePaymentStatus(
            payment.sessionId.toString(),
            'paid',
          );
        }
      }

      return {
        paymentId: statusResponse.data.paymentId,
        externalId: statusResponse.data.externalId,
        amount: statusResponse.data.amount,
        currency: statusResponse.data.currency,
        status: statusResponse.data.status,
        transactionId: statusResponse.data.transactionId,
        paymentMethod: statusResponse.data.paymentMethod,
        paidAt: statusResponse.data.paidAt,
        paymentReference: payment.paymentReference,
      };
    } catch (error) {
      this.logger.error('Failed to get payment status', {
        paymentId,
        userId: req.user.id,
        error: error.message,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get payment status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook/fapshi')
  @ApiOperation({
    summary: 'Fapshi webhook endpoint',
    description: 'Handles payment notifications from Fapshi',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleFapshiWebhook(
    @Body() payload: FapshiWebhookPayloadDto,
    @Headers('x-fapshi-signature') signature: string,
    @Req() request: Request,
  ) {
    try {
      this.logger.log('Fapshi webhook received', {
        paymentId: payload.paymentId,
        externalId: payload.externalId,
        status: payload.status,
      });

      // Verify webhook signature (implement based on Fapshi's method)
      const rawBody = JSON.stringify(payload);
      if (
        signature &&
        !this.fapshiService.verifyWebhookSignature(rawBody, signature)
      ) {
        this.logger.warn('Invalid webhook signature', { signature });
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      // Find payment by external ID
      const payment = await this.paymentsService.findByExternalId(
        payload.externalId,
      );

      if (!payment) {
        this.logger.warn('Payment not found for webhook', {
          externalId: payload.externalId,
        });
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      // Update payment status
      const newStatus = this.mapFapshiStatusToPaymentStatus(payload.status);
      const updatedPayment =
        await this.paymentsService.updatePaymentFromWebhook(payment.id, {
          status: newStatus,
          processedAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
          providerMetadata: {
            ...payment.providerMetadata,
            fapshiTransactionId: payload.transactionId,
            fapshiPaymentMethod: payload.paymentMethod,
            webhookData: payload,
          },
        });

      // Handle successful payment
      if (newStatus === PaymentStatus.SUCCESSFUL) {
        await this.handleSuccessfulPayment(updatedPayment);
      }

      // Handle failed payment
      if (
        newStatus === PaymentStatus.FAILED ||
        newStatus === PaymentStatus.EXPIRED
      ) {
        await this.handleFailedPayment(updatedPayment);
      }

      this.logger.log('Webhook processed successfully', {
        paymentId: payload.paymentId,
        newStatus,
      });

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error('Failed to process webhook', {
        payload,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to process webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapFapshiStatusToPaymentStatus(fapshiStatus: string): PaymentStatus {
    switch (fapshiStatus) {
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'SUCCESSFUL':
        return PaymentStatus.SUCCESSFUL;
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'EXPIRED':
        return PaymentStatus.EXPIRED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private async handleSuccessfulPayment(payment: any) {
    try {
      // Update session payment status
      await this.sessionsService.updatePaymentStatus(
        payment.sessionId.toString(),
        'paid',
      );

      // Process earnings for provider (if this is a booking payment)
      if (payment.paymentType === 'booking_payment') {
        // This would be handled by your existing wallet/earnings service
        this.logger.log('Processing earnings for successful payment', {
          paymentId: payment.id,
          providerId: payment.receiverId,
          amount: payment.amount,
        });
      }

      this.logger.log('Successful payment processed', {
        paymentId: payment.id,
      });
    } catch (error) {
      this.logger.error('Failed to handle successful payment', {
        paymentId: payment.id,
        error: error.message,
      });
    }
  }

  private async handleFailedPayment(payment: any) {
    try {
      // Update session status back to pending
      await this.sessionsService.updatePaymentStatus(
        payment.sessionId.toString(),
        'pending',
      );

      this.logger.log('Failed payment processed', { paymentId: payment.id });
    } catch (error) {
      this.logger.error('Failed to handle failed payment', {
        paymentId: payment.id,
        error: error.message,
      });
    }
  }
}
