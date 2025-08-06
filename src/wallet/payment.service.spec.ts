import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { WalletService } from './wallet.service';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from './schemas/payment.schema';
import {
  Booking,
  BookingStatus,
  PaymentStatus as BookingPaymentStatus,
} from '../bookings/schemas/booking.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentModel: any;
  let mockBookingModel: any;
  let mockConfigService: any;
  let mockWalletService: any;

  const mockBooking = {
    _id: 'bookingId123',
    seekerId: 'seekerId123',
    providerId: 'providerId123',
    totalAmount: 25000,
    paymentStatus: BookingPaymentStatus.PENDING,
    status: BookingStatus.CONFIRMED,
  };

  const mockPayment = {
    _id: 'paymentId123',
    payerId: 'seekerId123',
    receiverId: 'providerId123',
    bookingId: 'bookingId123',
    amount: 25000,
    provider: PaymentProvider.MTN_MONEY,
    status: PaymentStatus.PENDING,
    paymentReference: 'PAY-1641234567890-ABC123',
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    const mockPaymentModelValue = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      exec: jest.fn(),
    };

    const mockBookingModelValue = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          MTN_BASE_URL: 'https://sandbox.momodeveloper.mtn.com',
          MTN_SUBSCRIPTION_KEY: 'test-subscription-key',
          MTN_API_KEY: 'test-api-key',
          MTN_USER_ID: 'test-user-id',
          BASE_URL: 'https://api.has-backend.com',
          FRONTEND_URL: 'https://has-frontend.com',
          NODE_ENV: 'test',
        };
        return config[key] || defaultValue;
      }),
    };

    mockWalletService = {
      getOrCreateWallet: jest.fn(),
      processEarning: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken(Payment.name),
          useValue: function (paymentData: any) {
            return {
              ...mockPayment,
              ...paymentData,
              save: jest
                .fn()
                .mockResolvedValue({ ...mockPayment, ...paymentData }),
            };
          },
        },
        {
          provide: getModelToken(Booking.name),
          useValue: mockBookingModelValue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    mockPaymentModel = module.get(getModelToken(Payment.name));
    mockBookingModel = module.get(getModelToken(Booking.name));
  });

  describe('initiatePayment', () => {
    const createPaymentDto: CreatePaymentDto = {
      bookingId: 'bookingId123',
      amount: 25000,
      provider: PaymentProvider.MTN_MONEY,
      phoneNumber: '+237670123456',
      accountName: 'John Doe',
      description: 'Payment for house cleaning service',
    };

    it('should successfully initiate MTN payment', async () => {
      mockBookingModel.findById.mockResolvedValue(mockBooking);
      mockPaymentModel.findOne.mockResolvedValue(null); // No existing payment

      // Mock MTN API calls
      jest.spyOn(service as any, 'getMTNAccessToken').mockResolvedValue({
        access_token: 'test-access-token',
      });
      jest.spyOn(service as any, 'initiateMTNPayment').mockResolvedValue({
        transactionId: 'PAY-1641234567890-ABC123',
        status: 'PENDING',
      });

      const result = await service.initiatePayment(
        createPaymentDto,
        'seekerId123',
      );

      expect(result).toHaveProperty('paymentReference');
      expect(result).toHaveProperty('status', PaymentStatus.PROCESSING);
      expect(result).toHaveProperty('amount', 25000);
      expect(result).toHaveProperty('provider', PaymentProvider.MTN_MONEY);
      expect(result.message).toContain('MTN Mobile Money payment initiated');
    });

    it('should successfully initiate Orange payment', async () => {
      const orangePaymentDto = {
        ...createPaymentDto,
        provider: PaymentProvider.ORANGE_MONEY,
      };

      mockBookingModel.findById.mockResolvedValue(mockBooking);
      mockPaymentModel.findOne.mockResolvedValue(null);

      // Mock Orange API calls
      jest.spyOn(service as any, 'getOrangeAccessToken').mockResolvedValue({
        access_token: 'test-access-token',
      });
      jest.spyOn(service as any, 'initiateOrangePayment').mockResolvedValue({
        order_id: 'PAY-1641234567890-ABC123',
        payment_url: 'https://payment.orange.com/pay/123',
        status: 'PENDING',
      });

      const result = await service.initiatePayment(
        orangePaymentDto,
        'seekerId123',
      );

      expect(result).toHaveProperty('paymentReference');
      expect(result).toHaveProperty('status', PaymentStatus.PROCESSING);
      expect(result.message).toContain('Orange Money payment initiated');
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockBookingModel.findById.mockResolvedValue(null);

      await expect(
        service.initiatePayment(createPaymentDto, 'seekerId123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not the seeker', async () => {
      mockBookingModel.findById.mockResolvedValue(mockBooking);

      await expect(
        service.initiatePayment(createPaymentDto, 'wrongUserId'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when booking is already paid', async () => {
      const paidBooking = {
        ...mockBooking,
        paymentStatus: BookingPaymentStatus.PAID,
      };
      mockBookingModel.findById.mockResolvedValue(paidBooking);

      await expect(
        service.initiatePayment(createPaymentDto, 'seekerId123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when payment amount does not match booking amount', async () => {
      const wrongAmountDto = { ...createPaymentDto, amount: 30000 };
      mockBookingModel.findById.mockResolvedValue(mockBooking);

      await expect(
        service.initiatePayment(wrongAmountDto, 'seekerId123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when payment is already in progress', async () => {
      mockBookingModel.findById.mockResolvedValue(mockBooking);
      mockPaymentModel.findOne.mockResolvedValue(mockPayment); // Existing payment

      await expect(
        service.initiatePayment(createPaymentDto, 'seekerId123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const paymentWithBooking = {
        ...mockPayment,
        bookingId: { toString: () => 'bookingId123' },
      };

      mockPaymentModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(paymentWithBooking),
      });

      const result = await service.getPaymentStatus('PAY-1641234567890-ABC123');

      expect(result).toHaveProperty(
        'paymentReference',
        'PAY-1641234567890-ABC123',
      );
      expect(result).toHaveProperty('status', PaymentStatus.PENDING);
      expect(result).toHaveProperty('amount', 25000);
      expect(result).toHaveProperty('provider', PaymentProvider.MTN_MONEY);
      expect(result).toHaveProperty('bookingId', 'bookingId123');
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPaymentModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getPaymentStatus('nonexistent-reference'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleWebhook', () => {
    it('should handle MTN success webhook', async () => {
      const webhookPayload = {
        externalId: 'PAY-1641234567890-ABC123',
        status: 'SUCCESSFUL',
        financialTransactionId: '123456789',
      };

      const mockPaymentDoc = {
        ...mockPayment,
        save: jest.fn().mockResolvedValue(mockPayment),
      };

      mockPaymentModel.findOne.mockResolvedValue(mockPaymentDoc);
      mockBookingModel.findByIdAndUpdate.mockResolvedValue(mockBooking);

      await service.handleWebhook(PaymentProvider.MTN_MONEY, webhookPayload);

      expect(mockPaymentDoc.save).toHaveBeenCalled();
      expect(mockBookingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockPayment.bookingId,
        { paymentStatus: BookingPaymentStatus.PAID },
      );
    });

    it('should handle MTN failure webhook', async () => {
      const webhookPayload = {
        externalId: 'PAY-1641234567890-ABC123',
        status: 'FAILED',
        reason: 'Insufficient balance',
      };

      const mockPaymentDoc = {
        ...mockPayment,
        save: jest.fn().mockResolvedValue(mockPayment),
      };

      mockPaymentModel.findOne.mockResolvedValue(mockPaymentDoc);

      await service.handleWebhook(PaymentProvider.MTN_MONEY, webhookPayload);

      expect(mockPaymentDoc.save).toHaveBeenCalled();
      expect(mockPaymentDoc.status).toBe(PaymentStatus.FAILED);
      expect(mockPaymentDoc.failureReason).toBe('Insufficient balance');
    });

    it('should handle Orange success webhook', async () => {
      const webhookPayload = {
        order_id: 'PAY-1641234567890-ABC123',
        status: 'SUCCESS',
        transaction_id: 'OM123456789',
      };

      const mockPaymentDoc = {
        ...mockPayment,
        save: jest.fn().mockResolvedValue(mockPayment),
      };

      mockPaymentModel.findOne.mockResolvedValue(mockPaymentDoc);
      mockBookingModel.findByIdAndUpdate.mockResolvedValue(mockBooking);

      await service.handleWebhook(PaymentProvider.ORANGE_MONEY, webhookPayload);

      expect(mockPaymentDoc.save).toHaveBeenCalled();
      expect(mockBookingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockPayment.bookingId,
        { paymentStatus: BookingPaymentStatus.PAID },
      );
    });

    it('should throw NotFoundException when payment not found for webhook', async () => {
      const webhookPayload = {
        externalId: 'nonexistent-reference',
        status: 'SUCCESSFUL',
      };

      mockPaymentModel.findOne.mockResolvedValue(null);

      await expect(
        service.handleWebhook(PaymentProvider.MTN_MONEY, webhookPayload),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when webhook missing payment reference', async () => {
      const webhookPayload = {
        status: 'SUCCESSFUL',
        // Missing externalId/order_id
      };

      await expect(
        service.handleWebhook(PaymentProvider.MTN_MONEY, webhookPayload),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentHistory', () => {
    it('should return paginated payment history', async () => {
      const mockPayments = [mockPayment];

      mockPaymentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue(mockPayments),
                }),
              }),
            }),
          }),
        }),
      });

      mockPaymentModel.countDocuments.mockResolvedValue(1);

      const result = await service.getPaymentHistory('userId123', 1, 10);

      expect(result).toHaveProperty('payments', mockPayments);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.total).toBe(1);
    });

    it('should filter payment history by status', async () => {
      const mockPayments = [
        { ...mockPayment, status: PaymentStatus.SUCCESSFUL },
      ];

      mockPaymentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue(mockPayments),
                }),
              }),
            }),
          }),
        }),
      });

      mockPaymentModel.countDocuments.mockResolvedValue(1);

      await service.getPaymentHistory(
        'userId123',
        1,
        10,
        PaymentStatus.SUCCESSFUL,
      );

      expect(mockPaymentModel.find).toHaveBeenCalledWith({
        payerId: expect.any(Object),
        status: PaymentStatus.SUCCESSFUL,
      });
    });
  });

  describe('cancelPayment', () => {
    it('should successfully cancel pending payment', async () => {
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };

      mockPaymentModel.findOne.mockResolvedValue(pendingPayment);

      // Mock getPaymentStatus to return the cancelled payment
      jest.spyOn(service, 'getPaymentStatus').mockResolvedValue({
        paymentReference: 'PAY-1641234567890-ABC123',
        status: PaymentStatus.CANCELLED,
        amount: 25000,
        provider: PaymentProvider.MTN_MONEY,
        bookingId: 'bookingId123',
        message: 'Payment was cancelled',
      });

      const result = await service.cancelPayment(
        'PAY-1641234567890-ABC123',
        'seekerId123',
      );

      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(pendingPayment.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPaymentModel.findOne.mockResolvedValue(null);

      await expect(
        service.cancelPayment('nonexistent-reference', 'userId123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not the payer', async () => {
      mockPaymentModel.findOne.mockResolvedValue(mockPayment);

      await expect(
        service.cancelPayment('PAY-1641234567890-ABC123', 'wrongUserId'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payment cannot be cancelled', async () => {
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESSFUL,
      };
      mockPaymentModel.findOne.mockResolvedValue(completedPayment);

      await expect(
        service.cancelPayment('PAY-1641234567890-ABC123', 'seekerId123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generatePaymentReference', () => {
    it('should generate unique payment reference', async () => {
      const reference1 = (service as any).generatePaymentReference();
      const reference2 = (service as any).generatePaymentReference();

      expect(reference1).toMatch(/^PAY-\d+-[A-Z0-9]{6}$/);
      expect(reference2).toMatch(/^PAY-\d+-[A-Z0-9]{6}$/);
      expect(reference1).not.toBe(reference2);
    });
  });

  describe('getStatusMessage', () => {
    it('should return appropriate status messages', async () => {
      const getStatusMessage = (service as any).getStatusMessage;

      expect(getStatusMessage(PaymentStatus.PENDING)).toBe(
        'Payment is pending initiation',
      );
      expect(getStatusMessage(PaymentStatus.PROCESSING)).toBe(
        'Payment is being processed',
      );
      expect(getStatusMessage(PaymentStatus.SUCCESSFUL)).toBe(
        'Payment completed successfully',
      );
      expect(getStatusMessage(PaymentStatus.FAILED)).toBe('Payment failed');
      expect(getStatusMessage(PaymentStatus.CANCELLED)).toBe(
        'Payment was cancelled',
      );
      expect(getStatusMessage(PaymentStatus.EXPIRED)).toBe(
        'Payment has expired',
      );
      expect(getStatusMessage('unknown' as any)).toBe('Unknown payment status');
    });
  });
});
