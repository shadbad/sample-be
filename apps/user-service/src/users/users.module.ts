import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentityEventsListener } from '../listeners/identity-events.listener';
import { Role } from '../roles/role.entity';
import { RolesController } from '../roles/roles.controller';
import { RolesRepository } from '../roles/roles.repository';
import { I_USER_REPOSITORY } from './interfaces/user-repository.interface';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersController, RolesController],
  providers: [
    UsersService,
    { provide: I_USER_REPOSITORY, useClass: UsersRepository },
    RolesRepository,
    IdentityEventsListener,
  ],
  exports: [UsersService],
})
export class UsersModule {}
