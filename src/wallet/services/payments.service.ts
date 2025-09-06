import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from '../schemas/payment.schema';

export interface CreatePaymentData {
  payerId: string;
  receiverId: string;
  sessionId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  paymentType: string;
  paymentDetails: {
    phoneNumber: string;
    accountName: string;
    country?: string;
    countryCode?: string;
  };
  providerMetadata: any;
  paymentReference: string;
  description: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async create(createPaymentData: CreatePaymentData): Promise<PaymentDocument> {
    const payment = new this.paymentModel({
      payerId: new Types.ObjectId(createPaymentData.payerId),
      receiverId: new Types.ObjectId(createPaymentData.receiverId),
      sessionId: new Types.ObjectId(createPaymentData.sessionId),
      amount: createPaymentData.amount,
      currency: createPaymentData.currency,
      provider: createPaymentData.provider,
      status: createPaymentData.status,
      paymentType: createPaymentData.paymentType,
      paymentDetails: createPaymentData.paymentDetails,
      providerMetadata: createPaymentData.providerMetadata,
      paymentReference: createPaymentData.paymentReference,
      description: createPaymentData.description,
      expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
    });

    return payment.save();
  }

  async findById(id: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findById(id).exec();
  }

  async findByPaymentReference(
    paymentReference: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ paymentReference }).exec();
  }

  async findBySessionId(sessionId: string): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({ sessionId: new Types.ObjectId(sessionId) })
      .exec();
  }

  async findByProviderPaymentId(
    fapshiPaymentId: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        'providerMetadata.fapshiPaymentId': fapshiPaymentId,
      })
      .exec();
  }

  async findByExternalId(externalId: string): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        'providerMetadata.fapshiExternalId': externalId,
      })
      .exec();
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findByIdAndUpdate(
        id,
        {
          status,
          ...(status === PaymentStatus.SUCCESSFUL
            ? { processedAt: new Date() }
            : {}),
        },
        { new: true },
      )
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updateProviderMetadata(
    id: string,
    metadata: any,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findByIdAndUpdate(id, { providerMetadata: metadata }, { new: true })
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePaymentFromWebhook(
    id: string,
    updateData: {
      status: PaymentStatus;
      processedAt?: Date;
      providerMetadata?: any;
      failureReason?: string;
    },
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findByIdAndUpdate(
        id,
        {
          status: updateData.status,
          ...(updateData.processedAt
            ? { processedAt: updateData.processedAt }
            : {}),
          ...(updateData.providerMetadata
            ? { providerMetadata: updateData.providerMetadata }
            : {}),
          ...(updateData.failureReason
            ? { failureReason: updateData.failureReason }
            : {}),
          webhookReceivedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    this.logger.log(`Payment ${payment.paymentReference} updated via webhook`, {
      paymentId: id,
      newStatus: updateData.status,
    });

    return payment;
  }

  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: PaymentStatus,
  ) {
    const skip = (page - 1) * limit;
    const query: any = {
      $or: [
        { payerId: new Types.ObjectId(userId) },
        { receiverId: new Types.ObjectId(userId) },
      ],
    };

    if (status) {
      query.status = status;
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('sessionId', 'sessionDate startTime endTime totalAmount')
        .populate('payerId', 'fullName email')
        .populate('receiverId', 'fullName email')
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

  async getPaymentsByProvider(provider: PaymentProvider, limit: number = 50) {
    return this.paymentModel
      .find({ provider })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getSuccessfulPayments(startDate?: Date, endDate?: Date) {
    const query: any = { status: PaymentStatus.SUCCESSFUL };

    if (startDate && endDate) {
      query.processedAt = { $gte: startDate, $lte: endDate };
    }

    return this.paymentModel
      .find(query)
      .populate('payerId', 'fullName email')
      .populate('receiverId', 'fullName email')
      .populate('sessionId', 'sessionDate startTime endTime')
      .sort({ processedAt: -1 })
      .exec();
  }

  async cancelPayment(
    paymentReference: string,
    userId: string,
  ): Promise<PaymentDocument> {
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

    this.logger.log(`Payment cancelled`, {
      paymentReference,
      userId,
    });

    return payment;
  }

  async expireOldPayments(): Promise<number> {
    const expiredDate = new Date();
    const result = await this.paymentModel.updateMany(
      {
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiredAt: { $lt: expiredDate },
      },
      {
        status: PaymentStatus.EXPIRED,
        processedAt: new Date(),
        failureReason: 'Payment expired',
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} old payments`);
    }

    return result.modifiedCount;
  }

  async getPaymentStats(startDate?: Date, endDate?: Date) {
    const matchStage: any = {};

    if (startDate && endDate) {
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    const stats = await this.paymentModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successfulPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', PaymentStatus.SUCCESSFUL] }, 1, 0],
            },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.FAILED] }, 1, 0] },
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', PaymentStatus.PENDING] }, 1, 0],
            },
          },
          averageAmount: { $avg: '$amount' },
        },
      },
    ]);

    return (
      stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        averageAmount: 0,
      }
    );
  }
}
