import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Services
import { ProviderDashboardService } from './services/provider-dashboard.service';
import { EarningsAnalyticsService } from './services/earnings-analytics.service';
import { WithdrawalManagementService } from './services/withdrawal-management.service';
import { ProviderAnalyticsService } from './services/provider-analytics.service';
import { UpcomingBookingsService } from './services/upcoming-bookings.service';

// Controllers
import { ProvidersController } from './providers.controller';

// Schemas
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  Transaction,
  TransactionSchema,
} from '../wallet/schemas/transaction.schema';
import {
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from '../wallet/schemas/withdrawal-request.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [ProvidersController],
  providers: [
    ProviderDashboardService,
    EarningsAnalyticsService,
    WithdrawalManagementService,
    ProviderAnalyticsService,
    UpcomingBookingsService,
  ],
  exports: [
    ProviderDashboardService,
    EarningsAnalyticsService,
    WithdrawalManagementService,
    ProviderAnalyticsService,
    UpcomingBookingsService,
  ],
})
export class ProvidersModule {}
