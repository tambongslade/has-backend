import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminSeederService } from './admin-seeder.service';
import { AdminGuard } from './guards/admin.guard';

// Import schemas
import { User, UserSchema } from '../users/schemas/user.schema';
import { Session, SessionSchema } from '../bookings/schemas/session.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { Transaction, TransactionSchema } from '../wallet/schemas/transaction.schema';
import { ProviderReview, ProviderReviewSchema } from '../users/schemas/provider-review.schema';
import { Availability, AvailabilitySchema } from '../bookings/schemas/availability.schema';
import { Admin, AdminSchema } from './schemas/admin.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: ProviderReview.name, schema: ProviderReviewSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminAuthService, AdminSeederService, AdminGuard],
  exports: [AdminService, AdminAuthService, AdminGuard],
})
export class AdminDashboardModule {}