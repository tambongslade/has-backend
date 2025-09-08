import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@has.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'password123',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class AdminResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Admin user information',
  })
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'User ID to update' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Whether the account is active', example: true })
  isActive: boolean;
}
