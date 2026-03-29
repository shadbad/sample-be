import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiGatewayService } from './api-gateway.service';

/** Root controller for the API Gateway — exposes the public HTTP surface of this service. */
@ApiTags('health')
@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  /** GET / — returns a health-check greeting. */
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is up.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  getHello(): string {
    return this.apiGatewayService.getHello();
  }
}
