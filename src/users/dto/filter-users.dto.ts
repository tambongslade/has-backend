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
    example: {
      serviceCategories: ['cleaning', 'maintenance'],
      serviceAreas: ['Centre', 'Littoral'],
      serviceRadius: 25,
      experienceLevel: 'intermediate',
      bio: 'Professional cleaning service...',
      certifications: ['Professional Cleaner Certification'],
      portfolio: ['https://example.com/work1.jpg'],
      status: 'pending_approval',
      averageRating: 4.5,
      totalCompletedJobs: 15,
      totalReviews: 12,
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