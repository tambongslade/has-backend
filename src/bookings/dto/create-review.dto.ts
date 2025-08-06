import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
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
    example: 'Excellent service! Very professional and thorough cleaning.',
    description: 'Written review of the service',
  })
  @IsString()
  @IsOptional()
  review?: string;
}
