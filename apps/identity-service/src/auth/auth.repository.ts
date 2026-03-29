import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Credential } from './credential.entity';
import { IAuthRepository } from './interfaces/auth-repository.interface';

/** TypeORM implementation of IAuthRepository. */
@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @InjectRepository(Credential)
    private readonly _repo: Repository<Credential>,
  ) {}

  /** Find credential by email address. */
  findByEmail(email: string): Promise<Credential | null> {
    return this._repo.findOne({ where: { email } });
  }

  /** Find credential by userId (1:1 with user-service user). */
  findByUserId(userId: string): Promise<Credential | null> {
    return this._repo.findOne({ where: { userId } });
  }

  /** Find credential by SHA-256 refresh token hash. */
  findByRefreshTokenHash(hash: string): Promise<Credential | null> {
    return this._repo.findOne({ where: { refreshTokenHash: hash } });
  }

  /** Persist credential (insert or update). */
  save(credential: Credential): Promise<Credential> {
    return this._repo.save(credential);
  }
}
