import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ProxyService } from '../proxy/proxy.service';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';

/** Exposes user-service endpoints through the gateway. */
@Module({
  imports: [HttpModule],
  controllers: [UsersController, RolesController],
  providers: [ProxyService],
})
export class UsersModule {}
