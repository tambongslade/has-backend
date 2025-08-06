import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface FapshiPaymentLinkRequest {
  amount: number;
  description: string;
  externalId: string;
  redirectUrl?: string;
  webhookUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface FapshiPaymentLinkResponse {
  status: string;
  message: string;
  data: {
    paymentId: string;
    paymentUrl: string;
    amount: number;
    currency: string;
    externalId: string;
  };
}

export interface FapshiPaymentStatusResponse {
  status: string;
  message: string;
  data: {
    paymentId: string;
    externalId: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';
    transactionId?: string;
    paymentMethod?: string;
    paidAt?: string;
  };
}

@Injectable()
export class FapshiService {
  private readonly logger = new Logger(FapshiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly webhookUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUser = this.configService.get<string>('FAPSHI_API_USER') || '';
    this.apiKey = this.configService.get<string>('FAPSHI_API_KEY') || '';
    this.baseUrl = this.configService.get<string>(
      'FAPSHI_BASE_URL',
      'https://api.fapshi.com',
    );
    this.webhookUrl =
      this.configService.get<string>('FAPSHI_WEBHOOK_URL') || '';

    if (!this.apiUser || !this.apiKey) {
      throw new Error(
        'Fapshi API credentials are required. Please set FAPSHI_API_USER and FAPSHI_API_KEY',
      );
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        apiuser: this.apiUser,
        apikey: this.apiKey,
      },
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.url}`, {
          method: config.method,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      },
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response from ${response.config.url}`, {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.logger.error('Response error', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Create a payment link for a booking
   */
  async createPaymentLink(
    request: FapshiPaymentLinkRequest,
  ): Promise<FapshiPaymentLinkResponse> {
    try {
      const payload = {
        amount: request.amount,
        description: request.description,
        externalId: request.externalId,
        redirectUrl: request.redirectUrl,
        webhookUrl: request.webhookUrl || this.webhookUrl,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
      };

      const response = await this.httpClient.post('/initiate-pay', payload);

      if (response.data.status !== 'success') {
        throw new HttpException(
          `Failed to create payment link: ${response.data.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create payment link', {
        request,
        error: error.message,
        stack: error.stack,
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

  /**
   * Check payment status
   */
  async getPaymentStatus(
    paymentId: string,
  ): Promise<FapshiPaymentStatusResponse> {
    try {
      const response = await this.httpClient.get(
        `/payment-status/${paymentId}`,
      );

      if (response.data.status !== 'success') {
        throw new HttpException(
          `Failed to get payment status: ${response.data.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get payment status', {
        paymentId,
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

  /**
   * Verify webhook signature (if provided by Fapshi)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    // Note: This would need to be implemented based on Fapshi's webhook signature method
    // For now, we'll return true but this should be properly implemented for security
    this.logger.warn('Webhook signature verification not implemented');
    return true;
  }

  /**
   * Get minimum payment amount
   */
  getMinimumAmount(): number {
    return this.configService.get<number>('FAPSHI_MIN_AMOUNT', 500);
  }

  /**
   * Get payment currency
   */
  getCurrency(): string {
    return this.configService.get<string>('FAPSHI_CURRENCY', 'FCFA');
  }

  /**
   * Generate external ID for tracking
   */
  generateExternalId(bookingId: string): string {
    return `HAS_BOOKING_${bookingId}_${Date.now()}`;
  }
}
