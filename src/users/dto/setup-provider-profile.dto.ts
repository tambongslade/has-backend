import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import {
  ServiceCategory,
  CameroonProvince,
} from '../../services/schemas/service.schema';
import { ExperienceLevel } from '../schemas/user.schema';

export class SetupProviderProfileDto {
  @ApiProperty({
    description: 'Service categories the provider can offer',
    example: ['cleaning', 'plumbing'],
    enum: ServiceCategory,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'At least one service category must be selected',
  })
  @IsEnum(ServiceCategory, {
    each: true,
    message: 'Each service category must be valid',
  })
  serviceCategories: ServiceCategory[];

  @ApiProperty({
    description: 'Geographic areas the provider serves',
    example: ['Centre', 'Littoral'],
    enum: CameroonProvince,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service area must be selected' })
  @IsEnum(CameroonProvince, {
    each: true,
    message: 'Each service area must be valid',
  })
  serviceAreas: CameroonProvince[];

  @ApiProperty({
    description: 'Maximum travel distance in kilometers',
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber({}, { message: 'Service radius must be a number' })
  @Min(1, { message: 'Service radius must be at least 1 km' })
  @Max(100, { message: 'Service radius cannot exceed 100 km' })
  serviceRadius: number;

  @ApiProperty({
    description: 'Provider experience level',
    example: 'intermediate',
    enum: ExperienceLevel,
  })
  @IsEnum(ExperienceLevel, { message: 'Experience level must be valid' })
  experienceLevel: ExperienceLevel;

  @ApiProperty({
    description: 'Professional certifications',
    example: ['Certified Plumber', 'First Aid Certified'],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each certification must be a string' })
  certifications?: string[];

  @ApiProperty({
    description: 'Portfolio images URLs',
    example: ['https://example.com/work1.jpg', 'https://example.com/work2.jpg'],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each portfolio item must be a string' })
  portfolio?: string[];

  @ApiProperty({
    description: 'Provider bio and description',
    example:
      'Professional cleaner with 5+ years experience. Eco-friendly supplies available.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  bio?: string;
}

export class ProviderProfileResponseDto {
  @ApiProperty({ description: 'Profile setup success message' })
  message: string;

  @ApiProperty({ description: 'Provider status after setup' })
  status: string;

  @ApiProperty({ description: 'Whether profile is complete' })
  isProfileComplete: boolean;

  @ApiProperty({ description: 'Next steps for the provider' })
  nextSteps: string[];
}
