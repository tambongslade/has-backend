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
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceCategory,
  CameroonProvince,
} from '../../services/schemas/service.schema';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({
    example: 9.6412,
    description: 'Latitude coordinate',
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    example: 4.0511,
    description: 'Longitude coordinate',
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    example: 'Douala, Cameroon',
    description: 'Human-readable address',
  })
  @IsString()
  @IsOptional()
  address?: string;
}

export class ServiceRequestDto {
  @ApiProperty({
    enum: ServiceCategory,
    example: ServiceCategory.CLEANING,
    description: 'Category of service requested',
  })
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @ApiProperty({
    example: '2024-12-15',
    description: 'Date for the service (YYYY-MM-DD)',
  })
  @IsDateString()
  serviceDate: string;

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
    example: 4,
    description: 'Duration of the service in hours',
    minimum: 0.5,
    maximum: 12,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(12)
  duration: number;

  @ApiProperty({
    type: LocationDto,
    description: 'Location where service is needed',
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({
    enum: CameroonProvince,
    example: CameroonProvince.LITTORAL,
    description: 'Province in Cameroon',
  })
  @IsEnum(CameroonProvince)
  province: CameroonProvince;

  @ApiPropertyOptional({
    example: 'Please bring eco-friendly cleaning supplies',
    description: 'Special instructions for the provider',
  })
  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @ApiPropertyOptional({
    example: 'House cleaning for 3-bedroom apartment',
    description: 'Brief description of what needs to be done',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
