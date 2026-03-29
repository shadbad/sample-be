import { Injectable } from '@nestjs/common';

/** Service layer for the API Gateway application — thin routing/composition logic lives here. */
@Injectable()
export class ApiGatewayService {
  /** Returns a health-check greeting string. */
  getHello(): string {
    return 'Hello World!';
  }
}
