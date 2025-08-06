import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsArray,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    example: 'month',
    enum: ['week', 'month', 'quarter', 'year'],
    description: 'Analytics time period',
  })
  @IsOptional()
  @IsEnum(['week', 'month', 'quarter', 'year'])
  period?: string = 'month';
}

export class BookingAnalytics {
  @ApiProperty({ example: 45, description: 'Total bookings in period' })
  @IsNumber()
  total: number;

  @ApiProperty({ example: 42, description: 'Completed bookings' })
  @IsNumber()
  completed: number;

  @ApiProperty({ example: 2, description: 'Cancelled bookings' })
  @IsNumber()
  cancelled: number;

  @ApiProperty({ example: 1, description: 'Pending bookings' })
  @IsNumber()
  pending: number;

  @ApiProperty({ example: 15.8, description: 'Growth percentage' })
  @IsNumber()
  growth: number;
}

export class EarningsAnalytics {
  @ApiProperty({ example: 8750, description: 'Total earnings in FCFA' })
  @IsNumber()
  total: number;

  @ApiProperty({
    example: 208.3,
    description: 'Average earnings per booking in FCFA',
  })
  @IsNumber()
  average: number;

  @ApiProperty({ example: 23.5, description: 'Growth percentage' })
  @IsNumber()
  growth: number;
}

export class ServiceStat {
  @ApiProperty({ example: 'House Cleaning' })
  @IsString()
  title: string;

  @ApiProperty({ example: 18, description: 'Number of bookings' })
  @IsNumber()
  bookings: number;

  @ApiProperty({ example: 4500, description: 'Earnings in FCFA' })
  @IsNumber()
  earnings: number;
}

export class ServiceAnalytics {
  @ApiProperty({ type: ServiceStat })
  mostBooked: ServiceStat;

  @ApiProperty({ type: ServiceStat })
  topEarning: ServiceStat;
}

export class RatingAnalytics {
  @ApiProperty({ example: 4.8, description: 'Average rating' })
  @IsNumber()
  average: number;

  @ApiProperty({ example: 24, description: 'Total number of reviews' })
  @IsNumber()
  totalReviews: number;

  @ApiProperty({
    example: { '5': 18, '4': 4, '3': 2, '2': 0, '1': 0 },
    description: 'Rating distribution',
  })
  @IsObject()
  distribution: Record<string, number>;
}

export class PeakHourData {
  @ApiProperty({ example: 9, description: 'Hour of day (0-23)' })
  @IsNumber()
  hour: number;

  @ApiProperty({ example: 8, description: 'Number of bookings at this hour' })
  @IsNumber()
  bookings: number;
}

export class WeeklyTrendData {
  @ApiProperty({
    example: '2024-12-09',
    description: 'Date in YYYY-MM-DD format',
  })
  @IsString()
  date: string;

  @ApiProperty({ example: 3, description: 'Number of bookings' })
  @IsNumber()
  bookings: number;

  @ApiProperty({ example: 750, description: 'Earnings in FCFA' })
  @IsNumber()
  earnings: number;
}

export class AnalyticsDto {
  @ApiProperty({ example: 'month' })
  @IsString()
  period: string;

  @ApiProperty({ type: BookingAnalytics })
  bookings: BookingAnalytics;

  @ApiProperty({ type: EarningsAnalytics })
  earnings: EarningsAnalytics;

  @ApiProperty({ type: ServiceAnalytics })
  services: ServiceAnalytics;

  @ApiProperty({ type: RatingAnalytics })
  ratings: RatingAnalytics;

  @ApiProperty({ type: [PeakHourData] })
  peakHours: PeakHourData[];

  @ApiProperty({ type: [WeeklyTrendData] })
  weeklyTrend: WeeklyTrendData[];
}
