import { PartialType } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus } from '../schemas/booking.schema';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiPropertyOptional({
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
    description: 'Status of the booking',
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description: 'Payment status of the booking',
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    example: 'Client requested to reschedule',
    description: 'Reason for cancellation (if applicable)',
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @ApiPropertyOptional({
    example: 'Service completed successfully',
    description: 'Notes from the provider',
  })
  @IsString()
  @IsOptional()
  providerNotes?: string;
}
