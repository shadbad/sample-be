import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IdentityServiceService } from './identity-service.service';

/** Root controller for the Identity Service — exposes the authentication API surface. */
@ApiExcludeController()
@Controller()
export class IdentityServiceController {
  constructor(private readonly identityServiceService: IdentityServiceService) {}

  /** GET / — returns a health-check greeting. */
  @Get()
  getHello(): string {
    return this.identityServiceService.getHello();
  }
}
