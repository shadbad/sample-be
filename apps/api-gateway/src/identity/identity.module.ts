import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ProxyService } from '../proxy/proxy.service';
import { IdentityController } from './identity.controller';

/** Exposes identity-service auth endpoints through the gateway. */
@Module({
  imports: [HttpModule],
  controllers: [IdentityController],
  providers: [ProxyService],
})
export class IdentityModule {}
