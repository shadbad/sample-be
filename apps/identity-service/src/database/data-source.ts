import 'reflect-metadata';

import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: '.env.identity' });

import { Credential } from '../auth/credential.entity';

/** Standalone DataSource used by TypeORM CLI (migrations). */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [Credential],
  migrations: ['apps/identity-service/src/database/migrations/*.ts'],
  synchronize: false,
});
