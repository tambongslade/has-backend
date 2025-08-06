import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsString,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class EarningsQueryDto {
  @ApiPropertyOptional({
    example: 'month',
    enum: ['week', 'month', 'year', 'all'],
    description: 'Time period for earnings summary',
  })
  @IsOptional()
  @IsEnum(['week', 'month', 'year', 'all'])
  period?: string = 'month';

  @ApiPropertyOptional({
    example: '2024-12-01',
    description: 'Start date for custom range (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'End date for custom range (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EarningsSummary {
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
}

export class PeriodEarnings {
  @ApiProperty({ example: 'month', description: 'Period type' })
  @IsString()
  period: string;

  @ApiProperty({
    example: 8750,
    description: 'Earnings for the period in FCFA',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 23.5,
    description: 'Growth percentage compared to previous period',
  })
  @IsNumber()
  growth: number;

  @ApiProperty({ example: 35, description: 'Number of bookings in the period' })
  @IsNumber()
  bookingsCount: number;
}

export class DailyEarnings {
  @ApiProperty({
    example: '2024-12-15',
    description: 'Date in YYYY-MM-DD format',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 2500, description: 'Earnings for the day in FCFA' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 1, description: 'Number of bookings completed' })
  @IsNumber()
  bookingsCount: number;

  @ApiProperty({
    example: ['House Cleaning'],
    description: 'List of services provided on this day',
  })
  @IsArray()
  @IsString({ each: true })
  services: string[];
}

export class EarningsSummaryDto {
  @ApiProperty({ type: EarningsSummary })
  summary: EarningsSummary;

  @ApiProperty({ type: PeriodEarnings })
  periodEarnings: PeriodEarnings;

  @ApiProperty({ type: [DailyEarnings] })
  earningsBreakdown: DailyEarnings[];
}
