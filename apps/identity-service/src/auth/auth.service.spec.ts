import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { IDENTITY_EVENT_TYPES, IDENTITY_EVENTS_TOPIC } from '@libs/contracts';
import { ConflictException, UnauthorisedException } from '@libs/core';
import { PubSubPublisherService } from '@libs/infra';

import { AuthService } from './auth.service';
import { Credential } from './credential.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { I_AUTH_REPOSITORY, IAuthRepository } from './interfaces/auth-repository.interface';

function makeCredential(overrides: Partial<Credential> = {}): Credential {
  const c = new Credential();
  c.userId = 'user-uuid-1';
  c.email = 'user@example.com';
  c.passwordHash = '$2b$12$hashedpassword';
  c.isActive = true;
  c.refreshTokenHash = null;
  c.lastLoginAt = null;
  return Object.assign(c, overrides);
}

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: jest.Mocked<IAuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let pubSubService: jest.Mocked<PubSubPublisherService>;

  beforeEach(async () => {
    authRepo = createMock<IAuthRepository>();
    jwtService = createMock<JwtService>();
    configService = createMock<ConfigService>();
    pubSubService = createMock<PubSubPublisherService>();

    configService.get.mockReturnValue('15m');
    jwtService.sign.mockReturnValue('signed-jwt-token');
    pubSubService.publish.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: I_AUTH_REPOSITORY, useValue: authRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: PubSubPublisherService, useValue: pubSubService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'user@example.com',
      fullName: 'Jane Doe',
      password: 'SecurePass1!',
      roleId: '00000000-0000-0000-0000-000000000010',
    };

    it('given an email that already exists, when register is called, then it returns a ConflictException result', async () => {
      authRepo.findByEmail.mockResolvedValue(makeCredential());

      const result = await service.register(dto);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConflictException);
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('given valid data, when register is called, then it saves credential and publishes identity.user-registered event', async () => {
      authRepo.findByEmail.mockResolvedValue(null);
      authRepo.save.mockImplementation((c) => Promise.resolve(c));

      await service.register(dto);

      expect(authRepo.save).toHaveBeenCalledTimes(1);
      expect(pubSubService.publish).toHaveBeenCalledWith(
        IDENTITY_EVENTS_TOPIC,
        expect.objectContaining({
          eventType: IDENTITY_EVENT_TYPES.USER_REGISTERED,
          payload: expect.objectContaining({
            email: dto.email,
            fullName: dto.fullName,
            roleId: dto.roleId,
          }),
        }),
      );
    });

    it('given valid data, when register is called, then it returns AuthResponseDto with accessToken', async () => {
      authRepo.findByEmail.mockResolvedValue(null);
      authRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.register(dto);

      expect(result.success).toBe(true);
      if (result.success) {
        const auth: AuthResponseDto = result.data.auth;
        expect(auth.accessToken).toBe('signed-jwt-token');
        expect(auth.tokenType).toBe('Bearer');
        expect(typeof auth.expiresIn).toBe('number');
        expect(typeof result.data.userId).toBe('string');
      }
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'SecurePass1!',
    };

    it('given an email that does not exist, when login is called, then it returns an UnauthorisedException result', async () => {
      authRepo.findByEmail.mockResolvedValue(null);

      const result = await service.login(dto);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnauthorisedException);
        expect(result.error.code).toBe('UNAUTHORISED');
      }
    });

    it('given a wrong password, when login is called, then it returns an UnauthorisedException result', async () => {
      const credential = makeCredential({
        passwordHash: await bcrypt.hash('correct-password', 1),
      });
      authRepo.findByEmail.mockResolvedValue(credential);

      const result = await service.login({ ...dto, password: 'wrong-password' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnauthorisedException);
      }
    });

    it('given an inactive account, when login is called, then it returns an UnauthorisedException result', async () => {
      const hash = await bcrypt.hash(dto.password, 1);
      const credential = makeCredential({ passwordHash: hash, isActive: false });
      authRepo.findByEmail.mockResolvedValue(credential);

      const result = await service.login(dto);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnauthorisedException);
        expect(result.error.message).toContain('deactivated');
      }
    });

    it('given valid credentials, when login is called, then it updates lastLoginAt and returns accessToken', async () => {
      const hash = await bcrypt.hash(dto.password, 1);
      const credential = makeCredential({ passwordHash: hash });
      authRepo.findByEmail.mockResolvedValue(credential);
      authRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.login(dto);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.auth.accessToken).toBe('signed-jwt-token');
        expect(typeof result.data.rawRefreshToken).toBe('string');
        expect(result.data.rawRefreshToken.length).toBeGreaterThan(0);
      }
      expect(authRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });

  describe('logout', () => {
    it('given a valid userId, when logout is called, then it clears the refreshTokenHash', async () => {
      const credential = makeCredential({ refreshTokenHash: 'some-hash' });
      authRepo.findByUserId.mockResolvedValue(credential);
      authRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.logout('user-uuid-1');

      expect(result.success).toBe(true);
      expect(authRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenHash: null }),
      );
    });

    it('given an unknown userId, when logout is called, then it returns an UnauthorisedException result', async () => {
      authRepo.findByUserId.mockResolvedValue(null);

      const result = await service.logout('unknown-user-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnauthorisedException);
      }
    });
  });
});
