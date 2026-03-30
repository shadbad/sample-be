import 'reflect-metadata';

import * as bcrypt from 'bcrypt';

import { Credential } from '../../auth/credential.entity';
import { AppDataSource } from '../data-source';
import {
  DEFAULT_ADMIN_CREDENTIAL,
  DUMMY_USER_CREDENTIALS,
  DUMMY_USER_PASSWORD,
} from './data/credentials.seed';

/** Seed the admin credential if it does not already exist. */
async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(Credential);
  const existing = await repo.findOne({
    where: { userId: DEFAULT_ADMIN_CREDENTIAL.userId },
  });

  if (existing !== null) {
    console.log('Admin credential already exists — skipping.');
  } else {
    const credential = new Credential();
    credential.userId = DEFAULT_ADMIN_CREDENTIAL.userId;
    credential.email = DEFAULT_ADMIN_CREDENTIAL.email;
    credential.passwordHash = await bcrypt.hash(DEFAULT_ADMIN_CREDENTIAL.password, 12);
    credential.isActive = true;
    credential.refreshTokenHash = null;
    credential.lastLoginAt = null;
    await repo.save(credential);
    console.log('Admin credential seeded.');
  }

  const dummyHash = await bcrypt.hash(DUMMY_USER_PASSWORD, 12);
  for (const dummy of DUMMY_USER_CREDENTIALS) {
    const exists = await repo.findOne({ where: { userId: dummy.userId } });
    if (exists !== null) {
      console.log(`Credential for '${dummy.email}' already exists — skipping.`);
    } else {
      const credential = new Credential();
      credential.userId = dummy.userId;
      credential.email = dummy.email;
      credential.passwordHash = dummyHash;
      credential.isActive = true;
      credential.refreshTokenHash = null;
      credential.lastLoginAt = null;
      await repo.save(credential);
      console.log(`Credential for '${dummy.email}' seeded.`);
    }
  }

  await AppDataSource.destroy();
}

void seed();
