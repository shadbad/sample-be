import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { IdentityModule } from './identity/identity.module';
import { UsersModule } from './users/users.module';

/** Root module for the API Gateway — validates JWTs and proxies to downstream services. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.api-gateway' }),
    AuthModule,
    IdentityModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
