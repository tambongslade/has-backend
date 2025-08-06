import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSessionDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Service ID to book',
  })
  @IsString()
  serviceId: string;

  @ApiProperty({
    example: '2025-08-06',
    description: 'Date for the session (YYYY-MM-DD)',
  })
  @IsDateString()
  sessionDate: string;

  @ApiProperty({
    example: '09:00',
    description: 'Start time in HH:mm format',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    example: 5.5,
    description: 'Session duration in hours (can include overtime)',
    minimum: 0.5,
    maximum: 12,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Transform(({ value }) => parseFloat(value))
  @Min(0.5, { message: 'Minimum session duration is 0.5 hours' })
  @Max(12, { message: 'Maximum session duration is 12 hours' })
  duration: number;

  @ApiPropertyOptional({
    example: 'Please bring cleaning supplies',
    description: 'Additional notes for the provider',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
