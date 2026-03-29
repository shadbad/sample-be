import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { Credential } from './credential.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { I_AUTH_REPOSITORY } from './interfaces/auth-repository.interface';
import { JwtStrategy } from './strategies/jwt.strategy';

/** Provides registration, login, token refresh, and logout functionality. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Credential]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    { provide: I_AUTH_REPOSITORY, useClass: AuthRepository },
  ],
})
export class AuthModule {}
