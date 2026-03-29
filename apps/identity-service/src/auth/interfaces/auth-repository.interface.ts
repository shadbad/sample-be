import { Credential } from '../credential.entity';

export const I_AUTH_REPOSITORY = Symbol('IAuthRepository');

/** Repository interface for credential persistence operations. */
export interface IAuthRepository {
  /** Find a credential record by email address. */
  findByEmail(email: string): Promise<Credential | null>;
  /** Find a credential record by the associated user ID. */
  findByUserId(userId: string): Promise<Credential | null>;
  /** Find a credential record by SHA-256 refresh token hash. */
  findByRefreshTokenHash(hash: string): Promise<Credential | null>;
  /** Persist (insert or update) a credential record. */
  save(credential: Credential): Promise<Credential>;
}
