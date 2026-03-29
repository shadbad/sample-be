import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '@libs/core';

/** Stores authentication credentials. One row per registered user. */
@Entity('credentials')
export class Credential extends BaseEntity {
  /** Same UUID as the corresponding user-service User.id */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  /** Supports: IAuthRepository.findByEmail — login flow */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  /** SHA-256 of the raw refresh token UUID stored in the httpOnly cookie. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
