import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  pendingBalance: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  totalWithdrawn: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  isActive: boolean;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  withdrawalMethod?: string;

  @ApiProperty()
  transactionReference?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  processedAt?: Date;
}
