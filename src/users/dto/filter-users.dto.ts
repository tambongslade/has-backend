import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class FilterUsersDto {
  @ApiProperty({
    description: 'Filter users by active status',
    required: false,
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter users by role',
    required: false,
    enum: UserRole,
    example: UserRole.PROVIDER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'Search users by name, email, or phone',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => Math.min(parseInt(value), 50))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class AdminUserResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: '+237123456789', required: false })
  phoneNumber?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PROVIDER, required: false })
  role?: UserRole | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Provider profile details (only present for providers)',
    required: false,
    type: 'object',
    properties: {
      serviceCategories: {
        type: 'array',
        items: { type: 'string' },
        example: ['cleaning', 'maintenance'],
      },
      serviceAreas: {
        type: 'array',
        items: { type: 'string' },
        example: ['Centre', 'Littoral'],
      },
      serviceRadius: { type: 'number', example: 25 },
      experienceLevel: { type: 'string', example: 'intermediate' },
      bio: { type: 'string', example: 'Professional cleaning service...' },
      certifications: {
        type: 'array',
        items: { type: 'string' },
        example: ['Professional Cleaner Certification'],
      },
      portfolio: {
        type: 'array',
        items: { type: 'string' },
        example: ['https://example.com/work1.jpg'],
      },
      status: { type: 'string', example: 'pending_approval' },
      averageRating: { type: 'number', example: 4.5 },
      totalCompletedJobs: { type: 'number', example: 15 },
      totalReviews: { type: 'number', example: 12 },
    },
  })
  providerProfile?: {
    serviceCategories: string[];
    serviceAreas: string[];
    serviceRadius: number;
    experienceLevel: string;
    bio?: string;
    certifications: string[];
    portfolio: string[];
    status: string;
    averageRating: number;
    totalCompletedJobs: number;
    totalReviews: number;
    approvedAt?: Date;
    approvedBy?: string;
  };
}