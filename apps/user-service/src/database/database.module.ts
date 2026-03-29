import { Module } from '@nestjs/common';

import { createDatabaseModule } from '@libs/infra';

import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [createDatabaseModule([User, Role])],
})
export class DatabaseModule {}
