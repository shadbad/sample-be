import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';

import {
  IDENTITY_EVENT_TYPES,
  IDENTITY_EVENTS_TOPIC,
  IdentityUserRegisteredEvent,
} from '@libs/contracts';
import { ConflictException, err, ok, Result, UnauthorisedException } from '@libs/core';
import { PubSubPublisherService } from '@libs/infra';

import { Credential } from './credential.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { IAuthRepository } from './interfaces/auth-repository.interface';
import { I_AUTH_REPOSITORY } from './interfaces/auth-repository.interface';

const BCRYPT_ROUNDS = 12;

/** Handles registration, login, token refresh, and logout. */
@Injectable()
export class AuthService {
  private readonly _logger = new Logger(AuthService.name);

  constructor(
    @Inject(I_AUTH_REPOSITORY)
    private readonly _authRepo: IAuthRepository,
    private readonly _jwtService: JwtService,
    private readonly _config: ConfigService,
    private readonly _pubSub: PubSubPublisherService,
  ) {}

  /** Register a new credential, publish identity event, return access token. */
  async register(dto: RegisterDto): Promise<Result<{ auth: AuthResponseDto; userId: string }>> {
    const existing = await this._authRepo.findByEmail(dto.email);
    if (existing !== null) {
      return err(new ConflictException('Email already registered', { email: dto.email }));
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const credential = new Credential();
    credential.userId = userId;
    credential.email = dto.email;
    credential.passwordHash = passwordHash;
    credential.isActive = true;
    credential.refreshTokenHash = null;
    credential.lastLoginAt = null;

    await this._authRepo.save(credential);

    const event: IdentityUserRegisteredEvent = {
      eventType: IDENTITY_EVENT_TYPES.USER_REGISTERED,
      occurredAt: new Date().toISOString(),
      payload: {
        userId,
        email: dto.email,
        fullName: dto.fullName,
        roleId: dto.roleId,
      },
    };
    await this._pubSub.publish(IDENTITY_EVENTS_TOPIC, event);

    return ok({ auth: this._buildAuthResponse(credential), userId });
  }

  /**
   * Validate credentials, update lastLoginAt, issue JWT + refresh token.
   * Returns raw refresh token — caller must set it as httpOnly cookie.
   */
  async login(dto: LoginDto): Promise<Result<{ auth: AuthResponseDto; rawRefreshToken: string }>> {
    const credential = await this._authRepo.findByEmail(dto.email);
    if (credential === null) {
      return err(new UnauthorisedException('Invalid email or password'));
    }

    const passwordMatch = await bcrypt.compare(dto.password, credential.passwordHash);
    if (!passwordMatch) {
      return err(new UnauthorisedException('Invalid email or password'));
    }

    if (!credential.isActive) {
      return err(new UnauthorisedException('Account is deactivated'));
    }

    credential.lastLoginAt = new Date();
    const rawRefreshToken = randomUUID();
    credential.refreshTokenHash = this._hashToken(rawRefreshToken);
    await this._authRepo.save(credential);

    return ok({ auth: this._buildAuthResponse(credential), rawRefreshToken });
  }

  /** Rotate refresh token using the raw token from the cookie. */
  async refresh(
    rawRefreshToken: string,
  ): Promise<Result<{ auth: AuthResponseDto; rawRefreshToken: string }>> {
    const hash = this._hashToken(rawRefreshToken);
    const credential = await this._authRepo.findByRefreshTokenHash(hash);
    if (credential === null) {
      return err(new UnauthorisedException('Invalid or expired refresh token'));
    }

    const newRawRefreshToken = randomUUID();
    credential.refreshTokenHash = this._hashToken(newRawRefreshToken);
    await this._authRepo.save(credential);

    return ok({
      auth: this._buildAuthResponse(credential),
      rawRefreshToken: newRawRefreshToken,
    });
  }

  /** Clear refresh token hash, invalidating outstanding refresh tokens. */
  async logout(userId: string): Promise<Result<void>> {
    const credential = await this._authRepo.findByUserId(userId);
    if (credential === null) {
      return err(new UnauthorisedException('User not found'));
    }
    credential.refreshTokenHash = null;
    await this._authRepo.save(credential);
    return ok(undefined);
  }

  /** Issue a signed JWT and return an auth response DTO. */
  private _buildAuthResponse(credential: Credential): AuthResponseDto {
    const expiresIn = this._parseExpiresIn(this._config.get<string>('JWT_EXPIRES_IN', '15m'));
    const accessToken = this._jwtService.sign(
      { sub: credential.userId, email: credential.email },
      { expiresIn },
    );
    return { accessToken, tokenType: 'Bearer', expiresIn };
  }

  /** SHA-256 hash a raw token string. */
  private _hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Parse JWT expiry string (e.g. "15m", "900s") into seconds. */
  private _parseExpiresIn(value: string): number {
    const minMatch = /^(\d+)m$/.exec(value);
    if (minMatch !== null) return parseInt(minMatch[1] ?? '15', 10) * 60;
    const secMatch = /^(\d+)s$/.exec(value);
    if (secMatch !== null) return parseInt(secMatch[1] ?? '900', 10);
    return 900;
  }
}
