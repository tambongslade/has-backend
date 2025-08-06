import { Module, DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { Session, SessionSchema } from '../bookings/schemas/session.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { Transaction, TransactionSchema } from '../wallet/schemas/transaction.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from '../wallet/schemas/withdrawal-request.schema';
import { SimpleAdminController } from './simple-admin.controller';
import { WithdrawalManagementService } from '../providers/services/withdrawal-management.service';
import { INestApplication } from '@nestjs/common';

@Module({
  controllers: [SimpleAdminController],
  providers: [WithdrawalManagementService],
})
export class AdminWorkingModule {
  private static app: INestApplication;

  static setApp(app: INestApplication) {
    AdminWorkingModule.app = app;
    console.log('✅ AdminJS app reference set successfully');
  }

  static forRoot(): DynamicModule {
    return {
      module: AdminWorkingModule,
      imports: [
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Service.name, schema: ServiceSchema },
          { name: Session.name, schema: SessionSchema },
          { name: Wallet.name, schema: WalletSchema },
          { name: Transaction.name, schema: TransactionSchema },
          { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
        ]),
      ],
      controllers: [SimpleAdminController],
      providers: [WithdrawalManagementService],
    };
  }
}
