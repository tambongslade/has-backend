import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionConfigService } from './session-config.service';
import { SessionConfigController } from './session-config.controller';
import { SessionConfig, SessionConfigSchema } from './session-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionConfig.name, schema: SessionConfigSchema },
    ]),
  ],
  controllers: [SessionConfigController],
  providers: [SessionConfigService],
  exports: [SessionConfigService],
})
export class ConfigModule {}
