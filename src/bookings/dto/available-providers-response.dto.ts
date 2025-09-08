import { ApiProperty } from '@nestjs/swagger';
import {
  ServiceCategory,
  CameroonProvince,
} from '../../services/schemas/service.schema';

export class AvailableProviderDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Provider ID',
  })
  id: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Provider full name',
  })
  fullName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Provider email',
  })
  email: string;

  @ApiProperty({
    example: '+237600000000',
    description: 'Provider phone number',
  })
  phoneNumber?: string;

  @ApiProperty({
    example: 4.5,
    description: 'Provider average rating',
  })
  averageRating: number;

  @ApiProperty({
    example: 25,
    description: 'Total number of reviews',
  })
  totalReviews: number;

  @ApiProperty({
    example: 2.5,
    description: 'Distance from service location in km',
  })
  distance: number;

  @ApiProperty({
    example: 'Professional cleaner with 5 years experience',
    description: 'Provider bio/description',
  })
  bio?: string;

  @ApiProperty({
    example: ['cleaning', 'maintenance'],
    description: 'Service categories provider offers',
  })
  serviceCategories: string[];

  @ApiProperty({
    example: true,
    description: 'Whether provider is currently available',
  })
  isAvailable: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Last time provider was active',
  })
  lastActive?: Date;
}

export class ServiceRequestInfoDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Service request ID',
  })
  id: string;

  @ApiProperty({
    enum: ServiceCategory,
    example: ServiceCategory.CLEANING,
    description: 'Service category',
  })
  category: ServiceCategory;

  @ApiProperty({
    example: '2024-12-15',
    description: 'Requested service date',
  })
  serviceDate: string;

  @ApiProperty({
    example: '09:00',
    description: 'Start time',
  })
  startTime: string;

  @ApiProperty({
    example: '13:00',
    description: 'End time',
  })
  endTime: string;

  @ApiProperty({
    example: 4,
    description: 'Duration in hours',
  })
  duration: number;

  @ApiProperty({
    enum: CameroonProvince,
    example: CameroonProvince.LITTORAL,
    description: 'Service province',
  })
  province: CameroonProvince;

  @ApiProperty({
    example: 'Douala, Cameroon',
    description: 'Service address',
  })
  address: string;

  @ApiProperty({
    example: 15000,
    description: 'Estimated total cost in FCFA',
  })
  estimatedCost: number;
}

export class AvailableProvidersResponseDto {
  @ApiProperty({
    type: ServiceRequestInfoDto,
    description: 'Service request information',
  })
  serviceRequest: ServiceRequestInfoDto;

  @ApiProperty({
    type: [AvailableProviderDto],
    description: 'List of available providers',
  })
  providers: AvailableProviderDto[];

  @ApiProperty({
    example: 5,
    description: 'Total number of available providers found',
  })
  totalFound: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'When this search was performed',
  })
  searchTimestamp: Date;
}
