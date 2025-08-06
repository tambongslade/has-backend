import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '../../services/schemas/service.schema';

export class CreateProviderReviewDto {
  @ApiProperty({
    example: 5,
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Excellent provider! Very professional and reliable.',
    description: 'Written review of the provider',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    enum: ServiceCategory,
    example: ServiceCategory.CLEANING,
    description: 'Service category this review is related to',
  })
  @IsEnum(ServiceCategory)
  @IsOptional()
  serviceCategory?: ServiceCategory;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439020',
    description:
      'Related booking ID if this review is from a completed booking',
  })
  @IsMongoId()
  @IsOptional()
  relatedBookingId?: string;
}
