import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { Wallet } from './schemas/wallet.schema';
import { Transaction } from './schemas/transaction.schema';
import { BookingsService } from '../bookings/bookings.service';

describe('WalletService', () => {
  let service: WalletService;

  const mockWalletModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    save: jest.fn(),
  };

  const mockTransactionModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    save: jest.fn(),
  };

  const mockBookingsService = {
    findAll: jest.fn(),
    setWalletService: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
