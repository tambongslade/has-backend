import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import {
  Availability,
  AvailabilitySchema,
} from '../bookings/schemas/availability.schema';
import {
  ProviderReview,
  ProviderReviewSchema,
} from './schemas/provider-review.schema';
import {
  ProviderStatistics,
  ProviderStatisticsSchema,
} from './schemas/provider-statistics.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: ProviderReview.name, schema: ProviderReviewSchema },
      { name: ProviderStatistics.name, schema: ProviderStatisticsSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
