import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsPhoneNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider, PaymentType } from '../schemas/payment.schema';

export class CreatePaymentDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID for which payment is being made',
  })
  @IsMongoId()
  sessionId: string;

  @ApiProperty({
    example: 25000,
    description: 'Payment amount in FCFA',
    minimum: 100,
    maximum: 1000000,
  })
  @IsNumber()
  @Min(100)
  @Max(1000000)
  amount: number;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.MTN_MONEY,
    description: 'Mobile money provider',
  })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({
    example: '+237670123456',
    description: 'Phone number for mobile money payment (Cameroon format)',
  })
  @IsString()
  @Matches(/^(\+237|237)?[26][0-9]{8}$/, {
    message: 'Phone number must be a valid Cameroon number (+237XXXXXXXXX)',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Account holder name',
  })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({
    enum: PaymentType,
    example: PaymentType.BOOKING_PAYMENT,
    description: 'Type of payment',
    default: PaymentType.BOOKING_PAYMENT,
  })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiPropertyOptional({
    example: 'Payment for house cleaning service',
    description: 'Payment description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class PaymentResponseDto {
  @ApiProperty({
    example: 'PAY-1641234567890-ABC123',
    description: 'Payment reference ID',
  })
  paymentReference: string;

  @ApiProperty({
    example: 'pending',
    description: 'Payment status',
  })
  status: string;

  @ApiProperty({
    example: 25000,
    description: 'Payment amount',
  })
  amount: number;

  @ApiProperty({
    example: 'mtn_money',
    description: 'Payment provider',
  })
  provider: string;

  @ApiProperty({
    example:
      'Payment initiated successfully. Please complete the transaction on your phone.',
    description: 'Status message',
  })
  message: string;

  @ApiPropertyOptional({
    example: 'TXN123456789',
    description: 'Provider transaction ID',
  })
  providerTransactionId?: string;

  @ApiPropertyOptional({
    example: 300,
    description: 'Payment timeout in seconds',
  })
  timeout?: number;
}

export class PaymentStatusDto {
  @ApiProperty({
    example: 'PAY-1641234567890-ABC123',
    description: 'Payment reference ID',
  })
  paymentReference: string;

  @ApiProperty({
    example: 'successful',
    description: 'Payment status',
  })
  status: string;

  @ApiProperty({
    example: 25000,
    description: 'Payment amount',
  })
  amount: number;

  @ApiProperty({
    example: 'mtn_money',
    description: 'Payment provider',
  })
  provider: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Associated session ID',
  })
  sessionId: string;

  @ApiPropertyOptional({
    example: 'Payment completed successfully',
    description: 'Status message',
  })
  message?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00Z',
    description: 'Payment processed timestamp',
  })
  processedAt?: Date;
}

export class WebhookPayloadDto {
  @ApiProperty({
    example: 'payment.success',
    description: 'Webhook event type',
  })
  @IsString()
  event: string;

  @ApiProperty({
    example: 'PAY-1641234567890-ABC123',
    description: 'Payment reference ID',
  })
  @IsString()
  paymentReference: string;

  @ApiProperty({
    example: 'TXN123456789',
    description: 'Provider transaction ID',
  })
  @IsString()
  @IsOptional()
  providerTransactionId?: string;

  @ApiProperty({
    example: 'successful',
    description: 'Payment status',
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: 25000,
    description: 'Payment amount',
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    example: 'Payment completed successfully',
    description: 'Status message',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'Additional webhook data from provider',
  })
  @IsOptional()
  additionalData?: any;
}
