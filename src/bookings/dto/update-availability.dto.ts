import { PartialType } from '@nestjs/swagger';
import { CreateAvailabilityDto } from './create-availability.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAvailabilityDto extends PartialType(CreateAvailabilityDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether this availability is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
