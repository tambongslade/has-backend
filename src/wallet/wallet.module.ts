import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { PaymentController } from './payment.controller';
import { PaymentsController } from './controllers/payments.controller';
import { WalletService } from './wallet.service';
import { PaymentService } from './payment.service';
import { PaymentsService } from './services/payments.service';
import { FapshiService } from './services/fapshi.service';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from './schemas/withdrawal-request.schema';
import { Session, SessionSchema } from '../bookings/schemas/session.schema';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    forwardRef(() => BookingsModule),
  ],
  controllers: [WalletController, PaymentController, PaymentsController],
  providers: [WalletService, PaymentService, PaymentsService, FapshiService],
  exports: [WalletService, PaymentService, PaymentsService, FapshiService],
})
export class WalletModule {}
