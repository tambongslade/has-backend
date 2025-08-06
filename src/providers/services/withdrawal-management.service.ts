import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from '../../wallet/schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
} from '../../wallet/schemas/transaction.schema';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalStatus,
} from '../../wallet/schemas/withdrawal-request.schema';
import {
  WithdrawalRequestDto,
  WithdrawalResponseDto,
  WithdrawalQueryDto,
  WithdrawalHistoryDto,
  WithdrawalSummary,
  WithdrawalMethod,
  UpdateWithdrawalStatusDto,
} from '../dto/withdrawal.dto';

interface WithdrawalLimits {
  minimum: number;
  maximum: number;
  dailyLimit: number;
  monthlyLimit: number;
}

interface WithdrawalFeeConfig {
  bank_transfer: number;
  mobile_money: { rate: number; min: number; max: number };
  paypal: { rate: number; flat: number };
}

@Injectable()
export class WithdrawalManagementService {
  private readonly withdrawalLimits: WithdrawalLimits = {
    minimum: 5000, // FCFA
    maximum: 500000, // FCFA per transaction
    dailyLimit: 1000000, // FCFA
    monthlyLimit: 5000000, // FCFA
  };

  private readonly withdrawalFees: WithdrawalFeeConfig = {
    bank_transfer: 500, // Flat fee
    mobile_money: { rate: 0.02, min: 200, max: 1000 }, // 2% with min/max
    paypal: { rate: 0.03, flat: 500 }, // 3% + flat fee
  };

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(WithdrawalRequest.name)
    private withdrawalRequestModel: Model<WithdrawalRequestDocument>,
  ) {}

  async requestWithdrawal(
    providerId: string,
    dto: WithdrawalRequestDto,
  ): Promise<WithdrawalResponseDto> {
    const providerObjectId = new Types.ObjectId(providerId);

    // Validate withdrawal limits
    await this.validateWithdrawalLimits(providerObjectId, dto.amount);

    // Check available balance
    const wallet = await this.walletModel
      .findOne({ providerId: providerObjectId })
      .exec();
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Calculate fees
    const withdrawalFee = this.calculateWithdrawalFee(
      dto.amount,
      dto.withdrawalMethod,
    );
    const netAmount = dto.amount - withdrawalFee;

    // Get payment details based on method
    let paymentDetails: any = {};
    switch (dto.withdrawalMethod) {
      case WithdrawalMethod.BANK_TRANSFER:
        paymentDetails = dto.bankDetails;
        break;
      case WithdrawalMethod.MOBILE_MONEY:
        paymentDetails = dto.mobileMoneyDetails;
        break;
      case WithdrawalMethod.PAYPAL:
        paymentDetails = dto.paypalDetails;
        break;
    }

    // Create withdrawal request
    const withdrawalRequest = new this.withdrawalRequestModel({
      providerId: providerObjectId,
      amount: dto.amount,
      withdrawalFee,
      netAmount,
      withdrawalMethod: dto.withdrawalMethod,
      paymentDetails,
      notes: dto.notes,
      estimatedProcessingTime: this.getProcessingTime(dto.withdrawalMethod),
      status: WithdrawalStatus.PENDING,
    });

    const savedWithdrawal = await withdrawalRequest.save();

    // Reserve funds in wallet
    await this.walletModel.findOneAndUpdate(
      { providerId: providerObjectId },
      {
        $inc: {
          balance: -dto.amount,
          pendingBalance: dto.amount,
        },
      },
    );

    // Create transaction record
    await this.transactionModel.create({
      providerId: providerObjectId,
      type: TransactionType.WITHDRAWAL,
      amount: dto.amount,
      status: TransactionStatus.PENDING,
      description: `Withdrawal request via ${dto.withdrawalMethod}`,
      withdrawalMethod: dto.withdrawalMethod,
      transactionReference: (savedWithdrawal._id as any).toString(),
    });

    return this.mapToResponseDto(savedWithdrawal);
  }

  async getWithdrawalHistory(
    providerId: string,
    query: WithdrawalQueryDto,
  ): Promise<WithdrawalHistoryDto> {
    const providerObjectId = new Types.ObjectId(providerId);
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { providerId: providerObjectId };
    if (status) {
      filter.status = status;
    }

    const [withdrawals, total, summary] = await Promise.all([
      this.withdrawalRequestModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.withdrawalRequestModel.countDocuments(filter),
      this.getWithdrawalSummary(providerObjectId),
    ]);

    return {
      withdrawals: withdrawals.map((w) => this.mapToResponseDto(w)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async updateWithdrawalStatus(
    withdrawalId: string,
    dto: UpdateWithdrawalStatusDto,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRequestModel
      .findById(withdrawalId)
      .exec();
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    const previousStatus = withdrawal.status;

    // Update withdrawal status
    withdrawal.status = dto.status;
    withdrawal.adminNotes = dto.adminNotes;
    withdrawal.transactionReference = dto.transactionReference;

    if (dto.status === WithdrawalStatus.COMPLETED) {
      withdrawal.processedAt = new Date();
    }

    await withdrawal.save();

    // Update wallet and transaction based on status change
    await this.handleStatusChange(withdrawal, previousStatus, dto.status);

    return this.mapToResponseDto(withdrawal);
  }

  calculateWithdrawalFee(amount: number, method: string): number {
    switch (method) {
      case WithdrawalMethod.BANK_TRANSFER:
        return this.withdrawalFees.bank_transfer;

      case WithdrawalMethod.MOBILE_MONEY:
        const mobileConfig = this.withdrawalFees.mobile_money;
        const calculatedFee = amount * mobileConfig.rate;
        return Math.min(
          Math.max(calculatedFee, mobileConfig.min),
          mobileConfig.max,
        );

      case WithdrawalMethod.PAYPAL:
        const paypalConfig = this.withdrawalFees.paypal;
        return amount * paypalConfig.rate + paypalConfig.flat;

      default:
        return 0;
    }
  }

  async validateWithdrawalLimits(
    providerId: Types.ObjectId,
    amount: number,
  ): Promise<boolean> {
    // Check basic amount limits
    if (amount < this.withdrawalLimits.minimum) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${this.withdrawalLimits.minimum} FCFA`,
      );
    }

    if (amount > this.withdrawalLimits.maximum) {
      throw new BadRequestException(
        `Maximum withdrawal amount is ${this.withdrawalLimits.maximum} FCFA per transaction`,
      );
    }

    // Check daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dailyWithdrawals = await this.withdrawalRequestModel.aggregate([
      {
        $match: {
          providerId,
          status: {
            $in: [
              WithdrawalStatus.PENDING,
              WithdrawalStatus.PROCESSING,
              WithdrawalStatus.COMPLETED,
            ],
          },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const dailyTotal =
      dailyWithdrawals.length > 0 ? dailyWithdrawals[0].totalAmount : 0;
    if (dailyTotal + amount > this.withdrawalLimits.dailyLimit) {
      throw new BadRequestException(
        `Daily withdrawal limit of ${this.withdrawalLimits.dailyLimit} FCFA exceeded`,
      );
    }

    // Check monthly limit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyWithdrawals = await this.withdrawalRequestModel.aggregate([
      {
        $match: {
          providerId,
          status: {
            $in: [
              WithdrawalStatus.PENDING,
              WithdrawalStatus.PROCESSING,
              WithdrawalStatus.COMPLETED,
            ],
          },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const monthlyTotal =
      monthlyWithdrawals.length > 0 ? monthlyWithdrawals[0].totalAmount : 0;
    if (monthlyTotal + amount > this.withdrawalLimits.monthlyLimit) {
      throw new BadRequestException(
        `Monthly withdrawal limit of ${this.withdrawalLimits.monthlyLimit} FCFA exceeded`,
      );
    }

    return true;
  }

  private async getWithdrawalSummary(
    providerId: Types.ObjectId,
  ): Promise<WithdrawalSummary> {
    const [totalStats, pendingStats] = await Promise.all([
      // Total and average withdrawals
      this.withdrawalRequestModel.aggregate([
        {
          $match: {
            providerId,
            status: WithdrawalStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            totalWithdrawn: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Pending withdrawals
      this.withdrawalRequestModel.aggregate([
        {
          $match: {
            providerId,
            status: {
              $in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING],
            },
          },
        },
        {
          $group: {
            _id: null,
            pendingWithdrawals: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const totalWithdrawn =
      totalStats.length > 0 ? totalStats[0].totalWithdrawn : 0;
    const withdrawalCount = totalStats.length > 0 ? totalStats[0].count : 0;
    const pendingWithdrawals =
      pendingStats.length > 0 ? pendingStats[0].pendingWithdrawals : 0;
    const averageWithdrawalAmount =
      withdrawalCount > 0 ? totalWithdrawn / withdrawalCount : 0;

    return {
      totalWithdrawn,
      pendingWithdrawals,
      averageWithdrawalAmount: Math.round(averageWithdrawalAmount),
    };
  }

  private getProcessingTime(method: WithdrawalMethod): string {
    switch (method) {
      case WithdrawalMethod.BANK_TRANSFER:
        return '2-3 business days';
      case WithdrawalMethod.MOBILE_MONEY:
        return '1-2 hours';
      case WithdrawalMethod.PAYPAL:
        return '1-2 business days';
      default:
        return '2-3 business days';
    }
  }

  private async handleStatusChange(
    withdrawal: WithdrawalRequestDocument,
    previousStatus: WithdrawalStatus,
    newStatus: WithdrawalStatus,
  ): Promise<void> {
    const providerId = withdrawal.providerId;
    const amount = withdrawal.amount;

    // Update transaction record
    await this.transactionModel.findOneAndUpdate(
      { transactionReference: (withdrawal._id as any).toString() },
      {
        status: this.mapWithdrawalStatusToTransactionStatus(newStatus),
        processedAt:
          newStatus === WithdrawalStatus.COMPLETED ? new Date() : undefined,
      },
    );

    // Handle wallet balance updates
    if (
      newStatus === WithdrawalStatus.COMPLETED &&
      previousStatus !== WithdrawalStatus.COMPLETED
    ) {
      // Move from pending to withdrawn
      await this.walletModel.findOneAndUpdate(
        { providerId },
        {
          $inc: {
            pendingBalance: -amount,
            totalWithdrawn: amount,
          },
        },
      );
    } else if (
      newStatus === WithdrawalStatus.FAILED &&
      previousStatus !== WithdrawalStatus.FAILED
    ) {
      // Return funds to available balance
      await this.walletModel.findOneAndUpdate(
        { providerId },
        {
          $inc: {
            balance: amount,
            pendingBalance: -amount,
          },
        },
      );
    }
  }

  private mapWithdrawalStatusToTransactionStatus(
    status: WithdrawalStatus,
  ): TransactionStatus {
    switch (status) {
      case WithdrawalStatus.PENDING:
        return TransactionStatus.PENDING;
      case WithdrawalStatus.PROCESSING:
        return TransactionStatus.PROCESSING;
      case WithdrawalStatus.COMPLETED:
        return TransactionStatus.COMPLETED;
      case WithdrawalStatus.FAILED:
        return TransactionStatus.FAILED;
      default:
        return TransactionStatus.PENDING;
    }
  }

  private mapToResponseDto(
    withdrawal: WithdrawalRequestDocument,
  ): WithdrawalResponseDto {
    return {
      _id: (withdrawal._id as any).toString(),
      amount: withdrawal.amount,
      withdrawalMethod: withdrawal.withdrawalMethod,
      status: withdrawal.status,
      estimatedProcessingTime: withdrawal.estimatedProcessingTime || '',
      withdrawalFee: withdrawal.withdrawalFee,
      netAmount: withdrawal.netAmount,
      requestedAt: (withdrawal as any).createdAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString(),
      notes: withdrawal.notes,
      adminNotes: withdrawal.adminNotes,
      transactionReference: withdrawal.transactionReference,
    };
  }

  async getWithdrawalById(
    withdrawalId: string,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRequestModel
      .findById(withdrawalId)
      .exec();
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }
    return this.mapToResponseDto(withdrawal);
  }
}
