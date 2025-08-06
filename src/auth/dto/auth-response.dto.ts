import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/schemas/user.schema';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      fullName: 'John Doe',
      phoneNumber: '+237123456789',
      role: UserRole.SEEKER,
    },
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber?: string;
    role?: UserRole | null;
  };
}
