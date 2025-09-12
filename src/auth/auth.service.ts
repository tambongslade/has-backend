import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User, UserDocument, ProviderStatus } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Determine activation status based on role
    // Seekers and users without role are active immediately
    // Providers are inactive until profile setup and approval
    const isActive = registerDto.role !== 'provider';

    // Prepare user data
    const userData: any = {
      fullName: registerDto.fullName,
      email: registerDto.email,
      password: hashedPassword,
      phoneNumber: registerDto.phoneNumber,
      role: registerDto.role,
      isActive,
    };

    // If provider role and provider setup data is provided, include it
    if (registerDto.role === 'provider' && this.hasProviderSetupData(registerDto)) {
      userData.providerProfile = {
        serviceCategories: registerDto.serviceCategories,
        serviceAreas: registerDto.serviceAreas,
        serviceRadius: registerDto.serviceRadius,
        experienceLevel: registerDto.experienceLevel,
        certifications: registerDto.certifications || [],
        portfolio: registerDto.portfolio || [],
        bio: registerDto.bio,
        status: ProviderStatus.PENDING_APPROVAL,
        averageRating: 0,
        totalCompletedJobs: 0,
        totalReviews: 0,
        isOnDuty: false,
      };
    }

    // Create user
    const user = new this.userModel(userData);
    const savedUser = await user.save();

    // Generate appropriate message based on activation status and profile setup
    let message = 'Account created successfully.';
    if (registerDto.role === 'provider') {
      if (this.hasProviderSetupData(registerDto)) {
        message += ' Your provider profile has been set up and is pending approval. You will be able to log in once approved.';
      } else {
        message += ' Please complete your provider profile setup and wait for approval before logging in.';
      }
    } else {
      message += ' You can now log in.';
    }

    return {
      message,
      user: {
        id: (savedUser._id as any).toString(),
        email: savedUser.email,
        fullName: savedUser.fullName,
        phoneNumber: savedUser.phoneNumber,
        role: savedUser.role,
        isActive: savedUser.isActive,
      },
    };
  }

  private hasProviderSetupData(registerDto: RegisterDto): boolean {
    return !!(
      registerDto.serviceCategories?.length &&
      registerDto.serviceAreas?.length &&
      registerDto.serviceRadius &&
      registerDto.experienceLevel
    );
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: (user._id as any).toString(),
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async updateRole(
    userId: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<AuthResponseDto> {
    // Find the current user first to check existing state
    const existingUser = await this.userModel.findById(userId);

    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    // Determine new activation status based on role change
    let isActive = existingUser.isActive;
    
    // If changing to provider, deactivate until profile setup and approval
    if (updateRoleDto.role === 'provider' && existingUser.role !== 'provider') {
      isActive = false;
    }
    // If changing from provider to seeker, activate immediately
    else if (updateRoleDto.role === 'seeker' && existingUser.role === 'provider') {
      isActive = true;
    }

    // Update user with new role and activation status
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        role: updateRoleDto.role,
        isActive 
      },
      { new: true },
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new JWT token with updated role
    const payload: JwtPayload = {
      sub: (user._id as any).toString(),
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }
}
