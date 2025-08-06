import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class WalletBalance {
  @ApiProperty({ example: 12500, description: 'Available balance in FCFA' })
  @IsNumber()
  available: number;

  @ApiProperty({ example: 2800, description: 'Pending balance in FCFA' })
  @IsNumber()
  pending: number;

  @ApiProperty({ example: 15300, description: 'Total balance in FCFA' })
  @IsNumber()
  total: number;

  @ApiProperty({ example: 'FCFA' })
  @IsString()
  currency: string;
}

export class RecentTransaction {
  @ApiProperty({ example: '507f1f77bcf86cd799439020' })
  @IsString()
  _id: string;

  @ApiProperty({
    example: 'earning',
    enum: ['earning', 'withdrawal', 'commission', 'refund', 'fee'],
  })
  @IsEnum(['earning', 'withdrawal', 'commission', 'refund', 'fee'])
  type: string;

  @ApiProperty({ example: 2500, description: 'Transaction amount in FCFA' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Payment for House Cleaning Service' })
  @IsString()
  description: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439022' })
  @IsOptional()
  @IsString()
  withdrawalId?: string;

  @ApiProperty({
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status: string;

  @ApiProperty({ example: '2024-12-15T14:30:00Z' })
  @IsDateString()
  timestamp: string;
}

export class WalletInfoDto {
  @ApiProperty({ type: WalletBalance })
  balance: WalletBalance;

  @ApiProperty({ type: [RecentTransaction] })
  recentTransactions: RecentTransaction[];
}
