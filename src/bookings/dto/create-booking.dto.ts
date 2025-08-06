import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CameroonProvince } from '../../services/schemas/service.schema';

export class CreateBookingDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the service to book',
  })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    example: '2024-12-15',
    description: 'Date for the booking (YYYY-MM-DD)',
  })
  @IsDateString()
  bookingDate: string;

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
    example: '17:00',
    description: 'End time in HH:mm format',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty({
    example: 8,
    description: 'Duration of the service in hours',
    minimum: 1,
    maximum: 24,
  })
  @IsNumber()
  @Min(1)
  @Max(24)
  duration: number;

  @ApiProperty({
    enum: CameroonProvince,
    example: CameroonProvince.LITTORAL,
    description: 'Province in Cameroon where the service will be provided',
  })
  @IsEnum(CameroonProvince)
  serviceLocation: CameroonProvince;

  @ApiPropertyOptional({
    example:
      'Please bring eco-friendly cleaning supplies. Access code is 1234.',
    description: 'Special instructions for the provider',
  })
  @IsString()
  @IsOptional()
  specialInstructions?: string;
}
