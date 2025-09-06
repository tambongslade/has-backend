import {
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentLinkDto {
  @ApiProperty({
    description: 'Session ID to create payment for',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Custom redirect URL after payment completion',
    example: 'https://yourapp.com/payment/success',
  })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({
    description: 'Customer email for payment notifications',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number for payment',
    example: '+237670000000',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}

export class PaymentLinkResponseDto {
  @ApiProperty({
    description: 'Payment ID from Fapshi',
    example: 'fapshi_pay_123456789',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Payment URL to redirect customer to',
    example: 'https://checkout.fapshi.com/pay/123456789',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Payment amount in FCFA',
    example: 5000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    example: 'FCFA',
  })
  currency: string;

  @ApiProperty({
    description: 'External reference ID',
    example: 'HAS_BOOKING_507f1f77bcf86cd799439011_1640995200000',
  })
  externalId: string;

  @ApiProperty({
    description: 'Our internal payment reference',
    example: 'HAS_PAY_1640995200000',
  })
  paymentReference: string;
}
