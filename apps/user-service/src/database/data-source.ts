import 'reflect-metadata';

import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: '.env.user-service' });

import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';

/** Standalone DataSource used by TypeORM CLI (migrations). */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [User, Role],
  migrations: ['apps/user-service/src/database/migrations/*.ts'],
  synchronize: false,
});
