import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, ExperienceLevel } from '../../users/schemas/user.schema';
import { ServiceCategory, CameroonProvince } from '../../services/schemas/service.schema';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: '+237123456789',
    description: 'The phone number of the user (optional)',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.SEEKER,
    description:
      'The role of the user - seeker or provider (optional, can be set later during onboarding)',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // Provider-specific fields (required only when role is 'provider')
  @ApiPropertyOptional({
    description: 'Service categories the provider can offer (required for providers)',
    example: ['cleaning', 'plumbing'],
    enum: ServiceCategory,
    isArray: true,
  })
  @ValidateIf((o) => o.role === UserRole.PROVIDER)
  @IsArray()
  @ArrayMinSize(1, {
    message: 'At least one service category must be selected for providers',
  })
  @IsEnum(ServiceCategory, {
    each: true,
    message: 'Each service category must be valid',
  })
  serviceCategories?: ServiceCategory[];

  @ApiPropertyOptional({
    description: 'Geographic areas the provider serves (required for providers)',
    example: ['Centre', 'Littoral'],
    enum: CameroonProvince,
    isArray: true,
  })
  @ValidateIf((o) => o.role === UserRole.PROVIDER)
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service area must be selected for providers' })
  @IsEnum(CameroonProvince, {
    each: true,
    message: 'Each service area must be valid',
  })
  serviceAreas?: CameroonProvince[];

  @ApiPropertyOptional({
    description: 'Maximum travel distance in kilometers (required for providers)',
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @ValidateIf((o) => o.role === UserRole.PROVIDER)
  @IsNumber({}, { message: 'Service radius must be a number' })
  @Min(1, { message: 'Service radius must be at least 1 km' })
  @Max(100, { message: 'Service radius cannot exceed 100 km' })
  serviceRadius?: number;

  @ApiPropertyOptional({
    description: 'Provider experience level (required for providers)',
    example: 'intermediate',
    enum: ExperienceLevel,
  })
  @ValidateIf((o) => o.role === UserRole.PROVIDER)
  @IsEnum(ExperienceLevel, { message: 'Experience level must be valid' })
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({
    description: 'Professional certifications (optional for providers)',
    example: ['Certified Plumber', 'First Aid Certified'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each certification must be a string' })
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Portfolio images URLs (optional for providers)',
    example: ['https://example.com/work1.jpg', 'https://example.com/work2.jpg'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each portfolio item must be a string' })
  portfolio?: string[];

  @ApiPropertyOptional({
    description: 'Provider bio and description (optional for providers)',
    example:
      'Professional cleaner with 5+ years experience. Eco-friendly supplies available.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  bio?: string;
}
