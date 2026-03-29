import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { Credential } from '../auth/credential.entity';

/** Standalone DataSource used by TypeORM CLI (migrations). */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [Credential],
  migrations: ['apps/identity-service/src/database/migrations/*.ts'],
  synchronize: false,
});
