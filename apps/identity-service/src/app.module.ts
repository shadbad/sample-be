import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PubSubModule } from '@libs/infra';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

/** Root module for the identity-service. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.identity' }),
    DatabaseModule,
    PubSubModule.forRoot(),
    AuthModule,
  ],
})
export class AppModule {}
