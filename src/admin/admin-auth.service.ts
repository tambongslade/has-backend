import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { AdminLoginDto, AdminResponseDto } from './dto/admin-auth.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<AdminDocument | null> {
    const admin = await this.adminModel.findOne({ email, isActive: true });
    
    if (admin && await bcrypt.compare(password, admin.password)) {
      return admin;
    }
    
    return null;
  }

  async login(loginDto: AdminLoginDto): Promise<AdminResponseDto> {
    const { email, password } = loginDto;
    
    const admin = await this.validateAdmin(email, password);
    
    if (!admin) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    // Update last login
    await this.adminModel.findByIdAndUpdate(admin._id, {
      lastLogin: new Date(),
    });

    const payload = {
      email: admin.email,
      sub: (admin._id as any).toString(),
      role: 'admin',
      isAdmin: true,
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.log(`Admin login successful: ${email}`);

    return {
      access_token,
      admin: {
        id: (admin._id as any).toString(),
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    };
  }

  async createAdmin(email: string, password: string, fullName: string): Promise<AdminDocument> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = new this.adminModel({
      email,
      password: hashedPassword,
      fullName,
      role: 'admin',
    });

    return admin.save();
  }

  async findByEmail(email: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ email }).exec();
  }

  async ensureDefaultAdmin(): Promise<void> {
    const adminEmail = 'admin@has.com';
    const existingAdmin = await this.findByEmail(adminEmail);
    
    if (!existingAdmin) {
      await this.createAdmin(adminEmail, 'password123', 'HAS Administrator');
      this.logger.log('Default admin account created: admin@has.com');
    } else {
      this.logger.log('Default admin account already exists');
    }
  }
}