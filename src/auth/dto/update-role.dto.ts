import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/schemas/user.schema';

export class UpdateRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.SEEKER,
    description: 'The role to assign to the user - either seeker or provider',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
