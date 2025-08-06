import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import {
  Availability,
  AvailabilitySchema,
} from './schemas/availability.schema';
import { ServicesModule } from '../services/services.module';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Availability.name, schema: AvailabilitySchema },
    ]),
    ServicesModule, // Import ServicesModule to use ServicesService
    ConfigModule, // Import ConfigModule for session configuration
    forwardRef(() => WalletModule),
  ],
  controllers: [BookingsController, AvailabilityController, SessionsController],
  providers: [BookingsService, AvailabilityService, SessionsService],
  exports: [BookingsService, AvailabilityService, SessionsService],
})
export class BookingsModule {}
