import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsDate,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class ProviderSummaryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 45200, description: 'Total earnings in FCFA' })
  @IsNumber()
  totalEarnings: number;

  @ApiProperty({ example: 12500, description: 'Available balance in FCFA' })
  @IsNumber()
  availableBalance: number;

  @ApiProperty({ example: 2800, description: 'Pending balance in FCFA' })
  @IsNumber()
  pendingBalance: number;

  @ApiProperty({ example: 42400, description: 'Total withdrawn in FCFA' })
  @IsNumber()
  totalWithdrawn: number;

  @ApiProperty({ example: 4.8, description: 'Average rating out of 5' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;

  @ApiProperty({ example: 24, description: 'Total number of reviews' })
  @IsNumber()
  totalReviews: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDate()
  joinedDate: Date;
}

export class ProviderStatisticsDto {
  @ApiProperty({ example: 8, description: 'Number of active services' })
  @IsNumber()
  activeServices: number;

  @ApiProperty({ example: 156, description: 'Total bookings count' })
  @IsNumber()
  totalBookings: number;

  @ApiProperty({ example: 12, description: 'Bookings this week' })
  @IsNumber()
  thisWeekBookings: number;

  @ApiProperty({ example: 45, description: 'Bookings this month' })
  @IsNumber()
  thisMonthBookings: number;

  @ApiProperty({ example: 142, description: 'Completed bookings count' })
  @IsNumber()
  completedBookings: number;

  @ApiProperty({ example: 8, description: 'Cancelled bookings count' })
  @IsNumber()
  cancelledBookings: number;

  @ApiProperty({ example: 6, description: 'Pending bookings count' })
  @IsNumber()
  pendingBookings: number;

  @ApiProperty({
    example: 23.5,
    description: 'Monthly earnings growth percentage',
  })
  @IsNumber()
  monthlyEarningsGrowth: number;

  @ApiProperty({ example: 5, description: 'Weekly bookings growth percentage' })
  @IsNumber()
  weeklyBookingsGrowth: number;
}

export class NextBookingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  _id: string;

  @ApiProperty({ example: 'House Cleaning Service' })
  @IsString()
  serviceTitle: string;

  @ApiProperty({ example: 'Sarah Johnson' })
  @IsString()
  seekerName: string;

  @ApiProperty({ example: '2024-12-16T00:00:00Z' })
  @IsDate()
  bookingDate: Date;

  @ApiProperty({ example: '10:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 10000, description: 'Total amount in FCFA' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ example: 'confirmed' })
  @IsString()
  status: string;

  @ApiProperty({ example: 'Douala, Bonapriso' })
  @IsString()
  serviceLocation: string;
}

export class ActivityDto {
  @ApiProperty({
    example: 'booking_completed',
    enum: [
      'booking_completed',
      'booking_confirmed',
      'review_received',
      'withdrawal_processed',
    ],
  })
  @IsEnum([
    'booking_completed',
    'booking_confirmed',
    'review_received',
    'withdrawal_processed',
  ])
  type: string;

  @ApiProperty({ example: 'Service completed' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'House cleaning for Sarah Johnson' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: 2500,
    description: 'Amount in FCFA if applicable',
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 5, description: 'Rating if applicable' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ example: '2024-12-15T14:30:00Z' })
  @IsDate()
  timestamp: Date;
}

export class DashboardSummaryDto {
  @ApiProperty({ type: ProviderSummaryDto })
  provider: ProviderSummaryDto;

  @ApiProperty({ type: ProviderStatisticsDto })
  statistics: ProviderStatisticsDto;

  @ApiPropertyOptional({ type: NextBookingDto })
  @IsOptional()
  nextBooking?: NextBookingDto;

  @ApiProperty({ type: [ActivityDto] })
  recentActivities: ActivityDto[];
}
