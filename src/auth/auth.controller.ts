import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Version,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Version('1')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email, password, full name, and optional phone number. Account will be inactive until admin activation.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Example registration',
        value: {
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          password: 'password123',
          phoneNumber: '+237123456789',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered (account requires admin activation before login)',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'User with this email already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'email must be an email',
          'password must be longer than or equal to 8 characters',
        ],
        error: 'Bad Request',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Version('1')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user with email and password',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      example1: {
        summary: 'Example login',
        value: {
          email: 'john.doe@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials or account not activated',
    schema: {
      examples: {
        invalidCredentials: {
          summary: 'Invalid email or password',
          value: {
            statusCode: 401,
            message: 'Invalid credentials',
            error: 'Unauthorized',
          },
        },
        accountDisabled: {
          summary: 'Account not activated by admin',
          value: {
            statusCode: 401,
            message: 'Account is disabled',
            error: 'Unauthorized',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description:
      "Get the authenticated user's profile information. Requires valid JWT token.",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        email: 'john.doe@example.com',
        fullName: 'John Doe',
        phoneNumber: '+237123456789',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Patch('role')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user role',
    description:
      'Complete onboarding by setting user role to either seeker or provider. Requires valid JWT token.',
  })
  @ApiBody({
    type: UpdateRoleDto,
    description: 'Role to assign to the user',
    examples: {
      seeker: {
        summary: 'Set as seeker',
        value: {
          role: 'seeker',
        },
      },
      provider: {
        summary: 'Set as provider',
        value: {
          role: 'provider',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid role value',
    schema: {
      example: {
        statusCode: 400,
        message: ['role must be one of the following values: seeker, provider'],
        error: 'Bad Request',
      },
    },
  })
  async updateRole(
    @Request() req,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<AuthResponseDto> {
    return this.authService.updateRole(req.user.id, updateRoleDto);
  }
}
