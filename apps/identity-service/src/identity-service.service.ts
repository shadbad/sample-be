import { Injectable } from '@nestjs/common';

/** Service layer for the Identity Service — owns authentication and authorisation domain logic. */
@Injectable()
export class IdentityServiceService {
  /** Returns a health-check greeting string. */
  getHello(): string {
    return 'Hello World!';
  }
}
