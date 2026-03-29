import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';

/** Root controller for the API Gateway — exposes the public HTTP surface of this service. */
@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  /** GET / — returns a health-check greeting. */
  @Get()
  getHello(): string {
    return this.apiGatewayService.getHello();
  }
}
