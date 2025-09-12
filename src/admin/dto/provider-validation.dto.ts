import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProviderStatus } from '../../users/schemas/user.schema';

export class ApproveProviderDto {
  @ApiProperty({
    description: 'Admin notes for the approval',
    example: 'Profile reviewed and approved. All requirements met.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Admin notes must be a string' })
  @MaxLength(500, { message: 'Admin notes cannot exceed 500 characters' })
  adminNotes?: string;
}

export class RejectProviderDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Incomplete certifications. Please provide valid professional certifications.',
    maxLength: 500,
  })
  @IsString({ message: 'Rejection reason must be a string' })
  @MaxLength(500, { message: 'Rejection reason cannot exceed 500 characters' })
  rejectionReason: string;

  @ApiProperty({
    description: 'Admin notes for the rejection',
    example: 'Reviewed on 2024-12-16. Missing required certifications.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Admin notes must be a string' })
  @MaxLength(500, { message: 'Admin notes cannot exceed 500 characters' })
  adminNotes?: string;
}

export class UpdateProviderStatusDto {
  @ApiProperty({
    description: 'New provider status',
    example: 'active',
    enum: ProviderStatus,
  })
  @IsEnum(ProviderStatus, { message: 'Status must be a valid provider status' })
  status: ProviderStatus;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Account suspended due to policy violations.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;

  @ApiProperty({
    description: 'Admin notes for the status change',
    example: 'Status updated after review on 2024-12-16.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Admin notes must be a string' })
  @MaxLength(500, { message: 'Admin notes cannot exceed 500 characters' })
  adminNotes?: string;
}

export class ProviderListResponseDto {
  @ApiProperty({ description: 'Provider ID' })
  id: string;

  @ApiProperty({ description: 'Provider full name' })
  fullName: string;

  @ApiProperty({ description: 'Provider email' })
  email: string;

  @ApiProperty({ description: 'Provider phone number' })
  phoneNumber?: string;

  @ApiProperty({ description: 'Provider status' })
  status: ProviderStatus;

  @ApiProperty({ description: 'Service categories' })
  serviceCategories: string[];

  @ApiProperty({ description: 'Service areas' })
  serviceAreas: string[];

  @ApiProperty({ description: 'Experience level' })
  experienceLevel: string;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiProperty({ description: 'Total reviews' })
  totalReviews: number;

  @ApiProperty({ description: 'Date when profile was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Date when status was last updated' })
  updatedAt: Date;
}

export class ProviderValidationResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Updated provider status' })
  status: ProviderStatus;

  @ApiProperty({ description: 'Provider ID' })
  providerId: string;

  @ApiProperty({ description: 'Admin who performed the action' })
  adminId: string;

  @ApiProperty({ description: 'Timestamp of the action' })
  timestamp: Date;
}

export class PendingProvidersResponseDto {
  @ApiProperty({ type: [ProviderListResponseDto] })
  providers: ProviderListResponseDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: 'object',
    properties: {
      total: { type: 'number' },
      page: { type: 'number' },
      limit: { type: 'number' },
      totalPages: { type: 'number' },
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  @ApiProperty({ description: 'Summary information' })
  summary: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalSuspended: number;
  };
}

export class ProviderValidationDetailsDto {
  @ApiProperty({ description: 'Provider basic information' })
  provider: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  @ApiProperty({ description: 'Provider profile details for validation' })
  providerProfile: {
    serviceCategories: string[];
    serviceAreas: string[];
    serviceRadius: number;
    experienceLevel: string;
    certifications?: string[];
    portfolio?: string[];
    bio?: string;
    status: ProviderStatus;
    averageRating: number;
    totalCompletedJobs: number;
    totalReviews: number;
    isOnDuty: boolean;
    currentLocation?: {
      type: string;
      coordinates: [number, number];
      address?: string;
    };
    lastLocationUpdate?: Date;
    rejectionHistory?: Array<{
      reason: string;
      adminNotes?: string;
      rejectedAt: Date;
      rejectedBy: string;
    }>;
    approvalHistory?: Array<{
      adminNotes?: string;
      approvedAt: Date;
      approvedBy: string;
    }>;
  };

  @ApiProperty({ description: 'Services offered by the provider' })
  services: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    pricePerHour: number;
    status: string;
  }>;

  @ApiProperty({ description: 'Provider availability schedule' })
  availability: Array<{
    dayOfWeek: string;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>;
  }>;

  @ApiProperty({ description: 'Recent reviews for the provider' })
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string;
    reviewerId: {
      id: string;
      fullName: string;
    };
    serviceCategory: string;
    createdAt: Date;
    providerResponse?: {
      response: string;
      respondedAt: Date;
    };
  }>;

  @ApiProperty({ description: 'Profile completeness analysis' })
  profileCompleteness: {
    score: number; // 0-100
    requiredFields: {
      serviceCategories: boolean;
      serviceAreas: boolean;
      serviceRadius: boolean;
      experienceLevel: boolean;
    };
    optionalFields: {
      certifications: boolean;
      portfolio: boolean;
      bio: boolean;
    };
    missingFields: string[];
    recommendations: string[];
  };

  @ApiProperty({ description: 'Validation checklist for admins' })
  validationChecklist: {
    profileComplete: boolean;
    hasValidCertifications: boolean;
    hasPortfolioImages: boolean;
    serviceAreasReasonable: boolean;
    experienceLevelAppropriate: boolean;
    noRedFlags: boolean;
    readyForApproval: boolean;
  };
}