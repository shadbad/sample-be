import { Controller, Get } from '@nestjs/common';
import { UserServiceService } from './user-service.service';

/** Root controller for the User Service — exposes the user management API surface. */
@Controller()
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  /** GET / — returns a health-check greeting. */
  @Get()
  getHello(): string {
    return this.userServiceService.getHello();
  }
}
