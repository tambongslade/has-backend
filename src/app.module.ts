import { Module, DynamicModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { BookingsModule } from './bookings/bookings.module';
import { WalletModule } from './wallet/wallet.module';
import { ProvidersModule } from './providers/providers.module';
import { AdminWorkingModule } from './admin/admin-working.module';
import { ConfigModule as SessionConfigModule } from './config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {
  static async forRootAsync(): Promise<DynamicModule> {
    const adminModule = AdminWorkingModule.forRoot();

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get<string>('MONGODB_URI'),
          }),
          inject: [ConfigService],
        }),
        AuthModule,
        UsersModule,
        ServicesModule,
        BookingsModule,
        WalletModule,
        ProvidersModule,
        SessionConfigModule,
        adminModule,
      ],
    };
  }
}
