import { PartialType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus, PaymentStatus } from '../schemas/session.schema';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  @ApiPropertyOptional({
    enum: SessionStatus,
    example: SessionStatus.CONFIRMED,
    description: 'Session status',
  })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description: 'Payment status',
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    example: 'Session cancelled due to weather',
    description: 'Cancellation reason if applicable',
  })
  @IsOptional()
  cancellationReason?: string;
}
