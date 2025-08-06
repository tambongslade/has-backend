import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory, CameroonProvince } from '../schemas/service.schema';

export class CreateServiceDto {
  @ApiProperty({
    example: 'Professional House Cleaning',
    description: 'Title of the service',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Complete house cleaning including all rooms, kitchen, and bathrooms. Professional equipment provided.',
    description: 'Detailed description of the service',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: ServiceCategory,
    example: ServiceCategory.CLEANING,
    description: 'Category of the service',
  })
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  // Pricing is now handled by category-based system
  // No provider-set pricing allowed

  @ApiPropertyOptional({
    type: [String],
    example: ['image1.jpg', 'image2.jpg'],
    description: 'Array of image URLs for the service',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({
    enum: CameroonProvince,
    example: CameroonProvince.LITTORAL,
    description: 'Province in Cameroon where the service is provided',
  })
  @IsEnum(CameroonProvince)
  location: CameroonProvince;

  @ApiPropertyOptional({
    type: [String],
    example: ['eco-friendly', 'professional', 'reliable'],
    description: 'Tags to help categorize and search the service',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the service is currently available for booking',
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  // Session-based booking - no hourly minimums/maximums
  // All bookings are session-based with overtime billing
}
