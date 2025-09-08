import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus, PaymentStatus } from '../schemas/session.schema';
import { ServiceCategory, CameroonProvince } from '../../services/schemas/service.schema';

export class SessionLocationDto {
  @ApiPropertyOptional({
    example: 4.0511,
    description: 'Latitude coordinate of service location',
  })
  latitude?: number;

  @ApiPropertyOptional({
    example: 9.7679,
    description: 'Longitude coordinate of service location',
  })
  longitude?: number;

  @ApiPropertyOptional({
    example: '123 Main Street, Douala, Cameroon',
    description: 'Full address where service will be performed',
  })
  address?: string;

  @ApiPropertyOptional({
    enum: CameroonProvince,
    example: CameroonProvince.LITTORAL,
    description: 'Province where service will be performed',
  })
  province?: CameroonProvince;
}

export class SeekerInfoDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Seeker full name',
  })
  fullName: string;

  @ApiPropertyOptional({
    example: '+237123456789',
    description: 'Seeker phone number',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Seeker email address',
  })
  email?: string;
}

export class SessionResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID',
  })
  id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Seeker user ID',
  })
  seekerId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Provider user ID',
  })
  providerId?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Service ID',
  })
  serviceId: string;

  @ApiProperty({
    example: 'House Cleaning Service',
    description: 'Service name',
  })
  serviceName: string;

  @ApiProperty({
    enum: ServiceCategory,
    example: ServiceCategory.CLEANING,
    description: 'Service category',
  })
  category: ServiceCategory;

  @ApiProperty({
    example: '2025-08-06T00:00:00.000Z',
    description: 'Session date',
  })
  sessionDate: Date;

  @ApiProperty({
    example: '09:00',
    description: 'Start time',
  })
  startTime: string;

  @ApiProperty({
    example: '14:30',
    description: 'End time',
  })
  endTime: string;

  @ApiProperty({
    example: 4,
    description: 'Base session duration in hours',
  })
  baseDuration: number;

  @ApiProperty({
    example: 1.5,
    description: 'Overtime hours',
  })
  overtimeHours: number;

  @ApiProperty({
    example: 8000,
    description: 'Base session price in FCFA',
  })
  basePrice: number;

  @ApiProperty({
    example: 3000,
    description: 'Overtime price in FCFA',
  })
  overtimePrice: number;

  @ApiProperty({
    example: 11000,
    description: 'Total amount in FCFA',
  })
  totalAmount: number;

  @ApiProperty({
    example: 'FCFA',
    description: 'Currency',
  })
  currency: string;

  @ApiProperty({
    enum: SessionStatus,
    example: SessionStatus.PENDING_ASSIGNMENT,
    description: 'Session status',
  })
  status: SessionStatus;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
    description: 'Payment status',
  })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({
    example: 'Please bring cleaning supplies',
    description: 'Session notes',
  })
  notes?: string;

  @ApiPropertyOptional({
    example: 'Weather conditions',
    description: 'Cancellation reason',
  })
  cancellationReason?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Seeker rating (1-5)',
  })
  seekerRating?: number;

  @ApiPropertyOptional({
    example: 'Great service!',
    description: 'Seeker review',
  })
  seekerReview?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Provider rating (1-5)',
  })
  providerRating?: number;

  @ApiPropertyOptional({
    example: 'Professional client',
    description: 'Provider review',
  })
  providerReview?: string;

  @ApiProperty({
    example: '2025-08-05T10:30:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-08-05T14:15:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    type: SessionLocationDto,
    description: 'Location where service will be performed',
  })
  serviceLocation?: SessionLocationDto;

  @ApiPropertyOptional({
    type: SeekerInfoDto,
    description: 'Seeker information for provider contact',
  })
  seeker?: SeekerInfoDto;
}
