import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  Payment,
  PaymentDocument,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from './schemas/payment.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { PaymentStatus as BookingPaymentStatus } from '../bookings/schemas/booking.schema';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  PaymentStatusDto,
  WebhookPayloadDto,
} from './dto/create-payment.dto';
import { WalletService } from './wallet.service';

interface MTNPaymentRequest {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
  callbackUrl?: string;
}

interface OrangePaymentRequest {
  merchant_key: string;
  currency: string;
  order_id: string;
  amount: number;
  return_url: string;
  cancel_url: string;
  notif_url: string;
  lang: string;
  reference: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private configService: ConfigService,
    private walletService: WalletService,
  ) {}

  async initiatePayment(
    createPaymentDto: CreatePaymentDto,
    payerId: string,
  ): Promise<PaymentResponseDto> {
    // Validate booking exists and belongs to payer
    const booking = await this.bookingModel.findById(
      createPaymentDto.bookingId,
    );
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.seekerId.toString() !== payerId) {
      throw new BadRequestException('You can only pay for your own bookings');
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new ConflictException('Booking is already paid');
    }

    if (booking.totalAmount !== createPaymentDto.amount) {
      throw new BadRequestException(
        'Payment amount does not match booking amount',
      );
    }

    // Check for existing pending payment
    const existingPayment = await this.paymentModel.findOne({
      bookingId: createPaymentDto.bookingId,
      status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
    });

    if (existingPayment) {
      throw new ConflictException(
        'A payment is already in progress for this booking',
      );
    }

    // Create payment record
    const paymentReference = this.generatePaymentReference();
    const payment = new this.paymentModel({
      payerId: new Types.ObjectId(payerId),
      receiverId: booking.providerId,
      bookingId: createPaymentDto.bookingId,
      amount: createPaymentDto.amount,
      provider: createPaymentDto.provider,
      paymentType: createPaymentDto.paymentType || PaymentType.BOOKING_PAYMENT,
      paymentDetails: {
        phoneNumber: createPaymentDto.phoneNumber,
        accountName: createPaymentDto.accountName,
        countryCode: 'CM',
      },
      paymentReference,
      description:
        createPaymentDto.description || `Payment for booking ${booking._id}`,
      expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
    });

    await payment.save();

    try {
      let providerResponse: any;
      let message: string;
      let timeout = 300; // 5 minutes default

      if (createPaymentDto.provider === PaymentProvider.MTN_MONEY) {
        providerResponse = await this.initiateMTNPayment(payment);
        message =
          'MTN Mobile Money payment initiated. Please complete the transaction on your phone.';
        timeout = 300;
      } else if (createPaymentDto.provider === PaymentProvider.ORANGE_MONEY) {
        providerResponse = await this.initiateOrangePayment(payment);
        message =
          'Orange Money payment initiated. Please complete the transaction on your phone.';
        timeout = 300;
      } else {
        throw new BadRequestException('Unsupported payment provider');
      }

      // Update payment with provider response
      payment.providerMetadata.apiResponse = providerResponse;
      payment.providerMetadata.apiTransactionId =
        providerResponse.transactionId || providerResponse.order_id;
      payment.status = PaymentStatus.PROCESSING;
      await payment.save();

      return {
        paymentReference,
        status: payment.status,
        amount: payment.amount,
        provider: payment.provider,
        message,
        providerTransactionId: payment.providerMetadata.apiTransactionId,
        timeout,
      };
    } catch (error) {
      this.logger.error(
        `Payment initiation failed: ${error.message}`,
        error.stack,
      );

      // Update payment status to failed
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = error.message;
      await payment.save();

      throw new HttpException(
        `Payment initiation failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async initiateMTNPayment(payment: PaymentDocument): Promise<any> {
    const mtnConfig = {
      baseUrl: this.configService.get<string>(
        'MTN_BASE_URL',
        'https://sandbox.momodeveloper.mtn.com',
      ),
      subscriptionKey: this.configService.get<string>('MTN_SUBSCRIPTION_KEY'),
      apiKey: this.configService.get<string>('MTN_API_KEY'),
      userId: this.configService.get<string>('MTN_USER_ID'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };

    if (!mtnConfig.subscriptionKey || !mtnConfig.apiKey) {
      throw new Error('MTN Mobile Money configuration is missing');
    }

    // Generate access token
    const tokenResponse = await this.getMTNAccessToken();
    const accessToken = tokenResponse.access_token;

    const requestBody: MTNPaymentRequest = {
      amount: payment.amount.toString(),
      currency: 'EUR', // MTN sandbox uses EUR, production would be XAF
      externalId: payment.paymentReference,
      payer: {
        partyIdType: 'MSISDN',
        partyId: payment.paymentDetails.phoneNumber.replace('+237', '237'),
      },
      payerMessage: `Payment for HAS booking ${payment.bookingId}`,
      payeeNote: payment.description || 'HAS Service Payment',
      callbackUrl: `${this.configService.get<string>('BASE_URL')}/api/v1/payments/webhook/mtn`,
    };

    const response = await axios.post(
      `${mtnConfig.baseUrl}/collection/v1_0/requesttopay`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Reference-Id': payment.paymentReference,
          'X-Target-Environment':
            mtnConfig.environment === 'production' ? 'live' : 'sandbox',
          'Ocp-Apim-Subscription-Key': mtnConfig.subscriptionKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      transactionId: payment.paymentReference,
      status: 'PENDING',
      response: response.data,
    };
  }

  private async initiateOrangePayment(payment: PaymentDocument): Promise<any> {
    const orangeConfig = {
      baseUrl: this.configService.get<string>(
        'ORANGE_BASE_URL',
        'https://api.orange.com',
      ),
      merchantKey: this.configService.get<string>('ORANGE_MERCHANT_KEY'),
      clientId: this.configService.get<string>('ORANGE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('ORANGE_CLIENT_SECRET'),
    };

    if (!orangeConfig.merchantKey || !orangeConfig.clientId) {
      throw new Error('Orange Money configuration is missing');
    }

    // Generate access token
    const tokenResponse = await this.getOrangeAccessToken();
    const accessToken = tokenResponse.access_token;

    const requestBody: OrangePaymentRequest = {
      merchant_key: orangeConfig.merchantKey,
      currency: 'XAF',
      order_id: payment.paymentReference,
      amount: payment.amount,
      return_url: `${this.configService.get<string>('FRONTEND_URL')}/payment/success`,
      cancel_url: `${this.configService.get<string>('FRONTEND_URL')}/payment/cancel`,
      notif_url: `${this.configService.get<string>('BASE_URL')}/api/v1/payments/webhook/orange`,
      lang: 'fr',
      reference: payment.description || 'HAS Service Payment',
    };

    const response = await axios.post(
      `${orangeConfig.baseUrl}/omcoreapis/1.0.2/pay`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      order_id: payment.paymentReference,
      payment_url: response.data.payment_url,
      status: 'PENDING',
      response: response.data,
    };
  }

  private async getMTNAccessToken(): Promise<any> {
    const mtnConfig = {
      baseUrl: this.configService.get<string>(
        'MTN_BASE_URL',
        'https://sandbox.momodeveloper.mtn.com',
      ),
      subscriptionKey: this.configService.get<string>('MTN_SUBSCRIPTION_KEY'),
      apiKey: this.configService.get<string>('MTN_API_KEY'),
    };

    const response = await axios.post(
      `${mtnConfig.baseUrl}/collection/token/`,
      {},
      {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnConfig.subscriptionKey,
          Authorization: `Basic ${Buffer.from(mtnConfig.apiKey + ':').toString('base64')}`,
        },
      },
    );

    return response.data;
  }

  private async getOrangeAccessToken(): Promise<any> {
    const orangeConfig = {
      baseUrl: this.configService.get<string>(
        'ORANGE_BASE_URL',
        'https://api.orange.com',
      ),
      clientId: this.configService.get<string>('ORANGE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('ORANGE_CLIENT_SECRET'),
    };

    const credentials = Buffer.from(
      `${orangeConfig.clientId}:${orangeConfig.clientSecret}`,
    ).toString('base64');

    const response = await axios.post(
      `${orangeConfig.baseUrl}/oauth/v3/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }

  async getPaymentStatus(paymentReference: string): Promise<PaymentStatusDto> {
    const payment = await this.paymentModel
      .findOne({ paymentReference })
      .populate('bookingId');

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      paymentReference: payment.paymentReference,
      status: payment.status,
      amount: payment.amount,
      provider: payment.provider,
      bookingId: payment.bookingId.toString(),
      message: this.getStatusMessage(payment.status),
      processedAt: payment.processedAt,
    };
  }

  async handleWebhook(provider: PaymentProvider, payload: any): Promise<void> {
    this.logger.log(`Received ${provider} webhook: ${JSON.stringify(payload)}`);

    try {
      if (provider === PaymentProvider.MTN_MONEY) {
        await this.handleMTNWebhook(payload);
      } else if (provider === PaymentProvider.ORANGE_MONEY) {
        await this.handleOrangeWebhook(payload);
      }
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleMTNWebhook(payload: any): Promise<void> {
    const paymentReference = payload.externalId || payload.referenceId;

    if (!paymentReference) {
      throw new BadRequestException('Missing payment reference in webhook');
    }

    const payment = await this.paymentModel.findOne({ paymentReference });
    if (!payment) {
      throw new NotFoundException('Payment not found for webhook');
    }

    const status = payload.status;
    let paymentStatus: PaymentStatus;

    switch (status) {
      case 'SUCCESSFUL':
        paymentStatus = PaymentStatus.SUCCESSFUL;
        break;
      case 'FAILED':
        paymentStatus = PaymentStatus.FAILED;
        break;
      case 'PENDING':
        paymentStatus = PaymentStatus.PROCESSING;
        break;
      default:
        paymentStatus = PaymentStatus.FAILED;
    }

    await this.updatePaymentStatus(payment, paymentStatus, payload);
  }

  private async handleOrangeWebhook(payload: any): Promise<void> {
    const paymentReference = payload.order_id;

    if (!paymentReference) {
      throw new BadRequestException('Missing payment reference in webhook');
    }

    const payment = await this.paymentModel.findOne({ paymentReference });
    if (!payment) {
      throw new NotFoundException('Payment not found for webhook');
    }

    const status = payload.status;
    let paymentStatus: PaymentStatus;

    switch (status) {
      case 'SUCCESS':
      case 'SUCCESSFUL':
        paymentStatus = PaymentStatus.SUCCESSFUL;
        break;
      case 'FAILED':
      case 'FAILURE':
        paymentStatus = PaymentStatus.FAILED;
        break;
      case 'PENDING':
        paymentStatus = PaymentStatus.PROCESSING;
        break;
      case 'CANCELLED':
        paymentStatus = PaymentStatus.CANCELLED;
        break;
      default:
        paymentStatus = PaymentStatus.FAILED;
    }

    await this.updatePaymentStatus(payment, paymentStatus, payload);
  }

  private async updatePaymentStatus(
    payment: PaymentDocument,
    status: PaymentStatus,
    webhookData: any,
  ): Promise<void> {
    payment.status = status;
    payment.providerMetadata.webhookData = webhookData;
    payment.webhookReceivedAt = new Date();

    if (status === PaymentStatus.SUCCESSFUL) {
      payment.processedAt = new Date();

      // Update booking payment status
      await this.bookingModel.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: BookingPaymentStatus.PAID,
      });

      this.logger.log(
        `Payment ${payment.paymentReference} completed successfully`,
      );
    } else if (status === PaymentStatus.FAILED) {
      payment.failureReason =
        webhookData.reason || webhookData.message || 'Payment failed';
      this.logger.warn(
        `Payment ${payment.paymentReference} failed: ${payment.failureReason}`,
      );
    }

    await payment.save();
  }

  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: PaymentStatus,
  ) {
    const skip = (page - 1) * limit;
    const query: any = { payerId: new Types.ObjectId(userId) };

    if (status) {
      query.status = status;
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('bookingId', 'bookingDate startTime endTime totalAmount')
        .populate('receiverId', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private generatePaymentReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  private getStatusMessage(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PENDING:
        return 'Payment is pending initiation';
      case PaymentStatus.PROCESSING:
        return 'Payment is being processed';
      case PaymentStatus.SUCCESSFUL:
        return 'Payment completed successfully';
      case PaymentStatus.FAILED:
        return 'Payment failed';
      case PaymentStatus.CANCELLED:
        return 'Payment was cancelled';
      case PaymentStatus.EXPIRED:
        return 'Payment has expired';
      default:
        return 'Unknown payment status';
    }
  }

  async cancelPayment(
    paymentReference: string,
    userId: string,
  ): Promise<PaymentStatusDto> {
    const payment = await this.paymentModel.findOne({ paymentReference });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payerId.toString() !== userId) {
      throw new BadRequestException('You can only cancel your own payments');
    }

    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Payment cannot be cancelled in its current state',
      );
    }

    payment.status = PaymentStatus.CANCELLED;
    payment.processedAt = new Date();
    await payment.save();

    return this.getPaymentStatus(paymentReference);
  }
}
