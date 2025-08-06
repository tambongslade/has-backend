import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../schemas/availability.schema';

// Export DTOs from their respective files to avoid duplication
export { TimeSlotDto, CreateAvailabilityDto } from './create-availability.dto';
export { UpdateAvailabilityDto } from './update-availability.dto';

// Import TimeSlotDto for use in response DTO
import { TimeSlotDto } from './create-availability.dto';

export class AvailabilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty({ enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ type: [TimeSlotDto] })
  timeSlots: TimeSlotDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
