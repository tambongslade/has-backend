import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpcomingBookingsQueryDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Number of bookings to return (default: 5, max: 20)',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;

  @ApiPropertyOptional({
    example: 7,
    description: 'Number of days to look ahead (default: 7, max: 30)',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(30)
  days?: number = 7;
}

export class ServiceInfo {
  @ApiProperty({ example: 'House Cleaning Service' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'cleaning' })
  @IsString()
  category: string;
}

export class SeekerInfo {
  @ApiProperty({ example: 'Sarah Johnson' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+237123456789' })
  @IsString()
  phoneNumber: string;
}

export class UpcomingBooking {
  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  _id: string;

  @ApiProperty({ type: ServiceInfo })
  service: ServiceInfo;

  @ApiProperty({ type: SeekerInfo })
  seeker: SeekerInfo;

  @ApiProperty({ example: '2024-12-16T00:00:00Z' })
  @IsDateString()
  bookingDate: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 4, description: 'Duration in hours' })
  @IsNumber()
  duration: number;

  @ApiProperty({ example: 10000, description: 'Total amount in FCFA' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ example: 'confirmed' })
  @IsString()
  status: string;

  @ApiProperty({ example: 'Douala, Bonapriso' })
  @IsString()
  serviceLocation: string;

  @ApiPropertyOptional({ example: 'Please bring eco-friendly supplies' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiProperty({
    example: '18 hours',
    description: 'Time until booking starts',
  })
  @IsString()
  timeUntilBooking: string;
}

export class BookingSummary {
  @ApiProperty({ example: '2024-12-16T10:00:00Z' })
  @IsDateString()
  nextBooking: string;

  @ApiProperty({ example: 3, description: 'Total upcoming bookings count' })
  @IsNumber()
  totalUpcoming: number;

  @ApiProperty({
    example: 25000,
    description: 'Total expected earnings in FCFA',
  })
  @IsNumber()
  totalEarningsExpected: number;
}

export class UpcomingBookingsDto {
  @ApiProperty({ type: [UpcomingBooking] })
  upcomingBookings: UpcomingBooking[];

  @ApiProperty({ type: BookingSummary })
  summary: BookingSummary;
}
