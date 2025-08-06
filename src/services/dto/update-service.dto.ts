import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '../schemas/service.schema';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional({
    enum: ServiceStatus,
    example: ServiceStatus.ACTIVE,
    description: 'Status of the service',
  })
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;
}
