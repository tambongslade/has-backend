import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
} from './schemas/transaction.schema';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { SessionsService } from '../bookings/sessions.service';
import {
  SessionStatus,
  PaymentStatus,
} from '../bookings/schemas/session.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
  ) {
    // Set up the circular dependency
    setTimeout(() => {
      this.sessionsService.setWalletService(this);
    }, 0);
  }

  async getOrCreateWallet(providerId: string): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({
      providerId: new Types.ObjectId(providerId),
    });

    if (!wallet) {
      wallet = new this.walletModel({
        providerId: new Types.ObjectId(providerId),
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
      });
      await wallet.save();
    }

    return wallet;
  }

  async getWalletBalance(providerId: string): Promise<WalletDocument> {
    const wallet = await this.getOrCreateWallet(providerId);

    // Update pending balance based on current sessions
    await this.updatePendingBalance(providerId);

    const updatedWallet = await this.walletModel.findOne({
      providerId: new Types.ObjectId(providerId),
    });
    if (!updatedWallet) {
      throw new NotFoundException('Wallet not found');
    }

    return updatedWallet;
  }

  async getEarningsHistory(
    providerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({
          providerId: new Types.ObjectId(providerId),
          type: { $in: [TransactionType.EARNING, TransactionType.COMMISSION] },
        })
        .populate('sessionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments({
        providerId: new Types.ObjectId(providerId),
        type: { $in: [TransactionType.EARNING, TransactionType.COMMISSION] },
      }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionHistory(
    providerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({ providerId: new Types.ObjectId(providerId) })
        .populate('sessionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments({
        providerId: new Types.ObjectId(providerId),
      }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createWithdrawal(
    providerId: string,
    createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<TransactionDocument> {
    const wallet = await this.getOrCreateWallet(providerId);

    if (wallet.balance < createWithdrawalDto.amount) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    // Create withdrawal transaction
    const transaction = new this.transactionModel({
      providerId: new Types.ObjectId(providerId),
      type: TransactionType.WITHDRAWAL,
      amount: createWithdrawalDto.amount,
      status: TransactionStatus.PENDING,
      description: createWithdrawalDto.description || 'Withdrawal request',
      withdrawalMethod: createWithdrawalDto.withdrawalMethod,
      withdrawalDetails: createWithdrawalDto.withdrawalDetails,
      transactionReference: this.generateTransactionReference(),
    });

    await transaction.save();

    // Update wallet balance
    wallet.balance -= createWithdrawalDto.amount;
    wallet.totalWithdrawn += createWithdrawalDto.amount;
    await wallet.save();

    return transaction;
  }

  async processEarning(
    providerId: string,
    sessionId: string,
    amount: number,
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(providerId);

    // Check if earning already processed for this session
    const existingTransaction = await this.transactionModel.findOne({
      providerId: new Types.ObjectId(providerId),
      sessionId: new Types.ObjectId(sessionId),
      type: TransactionType.EARNING,
    });

    if (existingTransaction) {
      return; // Already processed
    }

    // Calculate platform commission (e.g., 10%)
    const commissionRate = 0.1;
    const commission = amount * commissionRate;
    const providerEarning = amount - commission;

    // Create earning transaction
    const transaction = new this.transactionModel({
      providerId: new Types.ObjectId(providerId),
      type: TransactionType.EARNING,
      amount: providerEarning,
      status: TransactionStatus.COMPLETED,
      description: 'Earning from completed session',
      sessionId: new Types.ObjectId(sessionId),
      processedAt: new Date(),
    });

    await transaction.save();

    // Create commission transaction (for tracking)
    const commissionTransaction = new this.transactionModel({
      providerId: new Types.ObjectId(providerId),
      type: TransactionType.COMMISSION,
      amount: -commission, // Negative amount to show deduction
      status: TransactionStatus.COMPLETED,
      description: 'Platform commission (10%)',
      sessionId: new Types.ObjectId(sessionId),
      processedAt: new Date(),
    });

    await commissionTransaction.save();

    // Update wallet
    wallet.balance += providerEarning;
    wallet.totalEarnings += providerEarning;

    // Remove from pending if it was there
    if (wallet.pendingBalance >= amount) {
      wallet.pendingBalance -= amount;
    }

    await wallet.save();
  }

  private async updatePendingBalance(providerId: string): Promise<void> {
    // Get all confirmed sessions that are paid but not yet completed
    const pendingSessions = await this.sessionsService.findByProvider(
      providerId,
      undefined,
      0,
      1000, // Large limit to get all sessions
    );

    const confirmedSessions = pendingSessions.sessions.filter(
      session => session.status === SessionStatus.CONFIRMED || 
                 session.status === SessionStatus.IN_PROGRESS
    );

    const pendingAmount = confirmedSessions.reduce(
      (total, session) => total + session.totalAmount,
      0,
    );

    await this.walletModel.updateOne(
      { providerId: new Types.ObjectId(providerId) },
      { pendingBalance: pendingAmount },
    );
  }

  private generateTransactionReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WTH-${timestamp}-${random}`;
  }

  async getWithdrawalHistory(
    providerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({
          providerId: new Types.ObjectId(providerId),
          type: TransactionType.WITHDRAWAL,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments({
        providerId: new Types.ObjectId(providerId),
        type: TransactionType.WITHDRAWAL,
      }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
