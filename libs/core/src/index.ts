export { BaseEntity } from './entities/base.entity';
export {
  AppException,
  ConflictException,
  NotFoundException,
  UnauthorisedException,
  ValidationException,
} from './exceptions/app.exception';
export { AllExceptionsFilter } from './filters/all-exceptions.filter';
export { err, ok } from './types/result.type';
export type { Result } from './types/result.type';
