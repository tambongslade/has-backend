import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  isAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const isAdminToken = payload.isAdmin === true || payload.role === 'admin';

    // If admin token, allow even if DB user is missing (dev/admin service tokens)
    if (isAdminToken) {
      const user = await this.userModel.findById(payload.sub);
      if (user) {
        return {
          id: (user._id as any).toString(),
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: 'admin',
          isAdmin: true,
        } as any;
      }
      return {
        id: payload.sub,
        email: payload.email,
        role: 'admin',
        isAdmin: true,
      } as any;
    }

    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.isActive === false) {
      throw new UnauthorizedException();
    }
    return {
      id: (user._id as any).toString(),
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
  }
}
