import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { ServiceRequestService } from './service-request.service';
import { ServiceRequestController } from './service-request.controller';
import { Session, SessionSchema } from './schemas/session.schema';
import {
  Availability,
  AvailabilitySchema,
} from './schemas/availability.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { ServicesModule } from '../services/services.module';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: User.name, schema: UserSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
    ServicesModule, // Import ServicesModule to use ServicesService
    ConfigModule, // Import ConfigModule for session configuration
    forwardRef(() => WalletModule),
  ],
  controllers: [
    AvailabilityController,
    SessionsController,
    ServiceRequestController,
  ],
  providers: [AvailabilityService, SessionsService, ServiceRequestService],
  exports: [AvailabilityService, SessionsService],
})
export class BookingsModule {}
