import { Module } from '@nestjs/common';

import { createDatabaseModule } from '@libs/infra';

import { Credential } from '../auth/credential.entity';

/** Registers the TypeORM connection scoped to the identity-service database. */
@Module({
  imports: [createDatabaseModule([Credential])],
})
export class DatabaseModule {}
