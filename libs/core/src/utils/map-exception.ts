import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AppException } from '../exceptions/app.exception';

/** Maps an AppException (or any error with a code) to the appropriate NestJS HttpException. */
export function mapException(error: AppException): HttpException {
  if (error.code === 'NOT_FOUND') return new NotFoundException(error.message);
  if (error.code === 'CONFLICT') return new ConflictException(error.message);
  if (error.code === 'UNAUTHORISED') return new UnauthorizedException(error.message);
  if (error.code === 'VALIDATION_ERROR') return new ConflictException(error.message);
  return new InternalServerErrorException(error.message);
}
