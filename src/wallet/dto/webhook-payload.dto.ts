import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FapshiWebhookPayloadDto {
  @ApiProperty({
    description: 'Payment ID from Fapshi',
    example: 'fapshi_pay_123456789',
  })
  @IsString()
  paymentId: string;

  @ApiProperty({
    description: 'External reference ID',
    example: 'HAS_BOOKING_507f1f77bcf86cd799439011_1640995200000',
  })
  @IsString()
  externalId: string;

  @ApiProperty({
    description: 'Payment amount in FCFA',
    example: 5000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    example: 'FCFA',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED'],
    example: 'SUCCESSFUL',
  })
  @IsIn(['PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED'])
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';

  @ApiPropertyOptional({
    description: 'Fapshi transaction ID',
    example: 'txn_123456789',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Payment method used',
    example: 'MTN_MOMO',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Payment completion timestamp',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+237670000000',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsString()
  customerEmail?: string;
}
