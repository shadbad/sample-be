import { Controller, Get } from '@nestjs/common';
import { IdentityServiceService } from './identity-service.service';

/** Root controller for the Identity Service — exposes the authentication API surface. */
@Controller()
export class IdentityServiceController {
  constructor(private readonly identityServiceService: IdentityServiceService) {}

  /** GET / — returns a health-check greeting. */
  @Get()
  getHello(): string {
    return this.identityServiceService.getHello();
  }
}
