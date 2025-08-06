import {
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../schemas/availability.schema';

export class TimeSlotDto {
  @ApiProperty({
    example: '09:00',
    description: 'Start time in HH:mm format',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    example: '17:00',
    description: 'End time in HH:mm format',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this time slot is available',
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class CreateAvailabilityDto {
  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
    description: 'Day of the week',
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({
    type: [TimeSlotDto],
    description: 'Available time slots for this day',
    example: [
      { startTime: '09:00', endTime: '12:00', isAvailable: true },
      { startTime: '14:00', endTime: '18:00', isAvailable: true },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];

  @ApiPropertyOptional({
    example: 'Available for emergency calls',
    description: 'Additional notes for this availability',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
