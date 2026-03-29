import { Injectable } from '@nestjs/common';

/** Service layer for the User Service — owns user profile and lifecycle domain logic. */
@Injectable()
export class UserServiceService {
  /** Returns a health-check greeting string. */
  getHello(): string {
    return 'Hello World!';
  }
}
