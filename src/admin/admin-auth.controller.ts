import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminResponseDto } from './dto/admin-auth.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Admin Authentication')
@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin user and receive JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: AdminLoginDto): Promise<AdminResponseDto> {
    return this.adminAuthService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get admin profile',
    description: 'Get current admin user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getProfile(@Body() req: any) {
    // The user info is available in req.user thanks to JWT guard
    return {
      id: req.user?.sub || req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      isAdmin: req.user?.isAdmin || false,
    };
  }

  @Get('demo-credentials')
  @ApiOperation({
    summary: 'Get demo admin credentials',
    description: 'Get demo credentials for testing (development only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo credentials retrieved',
  })
  async getDemoCredentials() {
    return {
      message: 'Demo Admin Credentials',
      email: 'admin@has.com',
      password: 'password123',
      note: 'Use these credentials to login to the admin dashboard',
    };
  }
}
