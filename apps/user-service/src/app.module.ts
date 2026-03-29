import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PubSubModule } from '@libs/infra';

import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.local' }),
    DatabaseModule,
    PubSubModule.forRoot(),
    UsersModule,
  ],
})
export class AppModule {}
