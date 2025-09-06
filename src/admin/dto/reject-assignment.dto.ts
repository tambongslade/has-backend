import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectAssignmentDto {
  @ApiProperty({
    example: 'Insufficient providers available in this area',
    description: 'Reason for rejecting the service request',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: 'Customer should try booking during weekdays for better availability',
    description: 'Optional admin notes about the rejection',
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class RejectAssignmentResponseDto {
  @ApiProperty({
    example: 'Service request rejected successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID that was rejected',
  })
  sessionId: string;

  @ApiProperty({
    example: 'rejected',
    description: 'Updated session status',
  })
  status: string;

  @ApiProperty({
    example: 'Insufficient providers available in this area',
    description: 'Reason for rejection',
  })
  rejectionReason: string;

  @ApiPropertyOptional({
    example: 'Customer should try booking during weekdays for better availability',
    description: 'Admin notes about the rejection',
  })
  adminNotes?: string;

  @ApiProperty({
    example: '2025-09-06T04:25:00.000Z',
    description: 'When the request was rejected',
  })
  rejectedAt: Date;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of admin who rejected the request',
  })
  rejectedBy: string;
}