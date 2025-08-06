import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateIf,
  Min,
  Max,
  IsPhoneNumber,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum WithdrawalMethod {
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  PAYPAL = 'paypal',
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class BankDetailsDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  accountName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'First Bank' })
  @IsString()
  bankName: string;

  @ApiPropertyOptional({ example: 'FBNBCMCX' })
  @IsOptional()
  @IsString()
  swiftCode?: string;
}

export class MobileMoneyDetailsDto {
  @ApiProperty({ example: '+237123456789' })
  @IsPhoneNumber('CM')
  mobileNumber: string;

  @ApiProperty({ example: 'MTN', enum: ['MTN', 'Orange'] })
  @IsEnum(['MTN', 'Orange'])
  operator: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  accountName: string;
}

export class PaypalDetailsDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  accountName: string;
}

export class WithdrawalRequestDto {
  @ApiProperty({
    example: 15000,
    description: 'Withdrawal amount in FCFA (min: 5000, max: 500000)',
  })
  @IsNumber()
  @Min(5000)
  @Max(500000)
  amount: number;

  @ApiProperty({
    example: 'bank_transfer',
    enum: WithdrawalMethod,
    description: 'Withdrawal method',
  })
  @IsEnum(WithdrawalMethod)
  withdrawalMethod: WithdrawalMethod;

  @ApiPropertyOptional({
    type: BankDetailsDto,
    description: 'Required for bank_transfer method',
  })
  @ValidateIf((o) => o.withdrawalMethod === WithdrawalMethod.BANK_TRANSFER)
  @IsObject()
  bankDetails?: BankDetailsDto;

  @ApiPropertyOptional({
    type: MobileMoneyDetailsDto,
    description: 'Required for mobile_money method',
  })
  @ValidateIf((o) => o.withdrawalMethod === WithdrawalMethod.MOBILE_MONEY)
  @IsObject()
  mobileMoneyDetails?: MobileMoneyDetailsDto;

  @ApiPropertyOptional({
    type: PaypalDetailsDto,
    description: 'Required for paypal method',
  })
  @ValidateIf((o) => o.withdrawalMethod === WithdrawalMethod.PAYPAL)
  @IsObject()
  paypalDetails?: PaypalDetailsDto;

  @ApiPropertyOptional({ example: 'Monthly withdrawal' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WithdrawalResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439022' })
  @IsString()
  _id: string;

  @ApiProperty({ example: 15000, description: 'Withdrawal amount in FCFA' })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: WithdrawalMethod.BANK_TRANSFER,
    enum: WithdrawalMethod,
  })
  @IsEnum(WithdrawalMethod)
  withdrawalMethod: WithdrawalMethod;

  @ApiProperty({ example: WithdrawalStatus.PENDING, enum: WithdrawalStatus })
  @IsEnum(WithdrawalStatus)
  status: WithdrawalStatus;

  @ApiProperty({ example: '2-3 business days' })
  @IsString()
  estimatedProcessingTime: string;

  @ApiProperty({ example: 500, description: 'Withdrawal fee in FCFA' })
  @IsNumber()
  withdrawalFee: number;

  @ApiProperty({ example: 14500, description: 'Net amount after fees in FCFA' })
  @IsNumber()
  netAmount: number;

  @ApiProperty({ example: '2024-12-15T16:00:00Z' })
  @IsDateString()
  requestedAt: string;

  @ApiPropertyOptional({ example: '2024-12-16T14:30:00Z' })
  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @ApiPropertyOptional({ example: 'Monthly withdrawal' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Transfer completed successfully' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({ example: 'TXN123456789' })
  @IsOptional()
  @IsString()
  transactionReference?: string;
}

export class WithdrawalQueryDto {
  @ApiPropertyOptional({
    enum: WithdrawalStatus,
    description: 'Filter by withdrawal status',
  })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (default: 20, max: 50)',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class WithdrawalSummary {
  @ApiProperty({
    example: 42400,
    description: 'Total withdrawn amount in FCFA',
  })
  @IsNumber()
  totalWithdrawn: number;

  @ApiProperty({
    example: 0,
    description: 'Pending withdrawals amount in FCFA',
  })
  @IsNumber()
  pendingWithdrawals: number;

  @ApiProperty({
    example: 12500,
    description: 'Average withdrawal amount in FCFA',
  })
  @IsNumber()
  averageWithdrawalAmount: number;
}

export class WithdrawalHistoryDto {
  @ApiProperty({ type: [WithdrawalResponseDto] })
  withdrawals: WithdrawalResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 25,
      totalPages: 2,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: WithdrawalSummary })
  summary: WithdrawalSummary;
}

export class UpdateWithdrawalStatusDto {
  @ApiProperty({ enum: WithdrawalStatus })
  @IsEnum(WithdrawalStatus)
  status: WithdrawalStatus;

  @ApiPropertyOptional({ example: 'Transfer completed successfully' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({ example: 'TXN123456789' })
  @IsOptional()
  @IsString()
  transactionReference?: string;
}
