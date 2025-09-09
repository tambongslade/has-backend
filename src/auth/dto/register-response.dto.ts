import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/schemas/user.schema';

export class RegisterResponseDto {
  @ApiProperty({
    example: 'Account created successfully. Please wait for admin activation before logging in.',
    description: 'Registration success message',
  })
  message: string;

  @ApiProperty({
    example: {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      fullName: 'John Doe',
      phoneNumber: '+237123456789',
      role: null,
      isActive: false,
    },
    description: 'Created user information (without access token)',
  })
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber?: string;
    role?: UserRole | null;
    isActive: boolean;
  };
}