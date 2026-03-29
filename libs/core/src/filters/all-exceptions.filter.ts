import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  AppException,
  ConflictException,
  NotFoundException,
  UnauthorisedException,
  ValidationException,
} from '../exceptions/app.exception';

/** Maps AppException subclasses to HTTP status codes. */
function resolveStatus(exception: unknown): number {
  if (exception instanceof NotFoundException) return HttpStatus.NOT_FOUND;
  if (exception instanceof ConflictException) return HttpStatus.CONFLICT;
  if (exception instanceof ValidationException)
    return HttpStatus.UNPROCESSABLE_ENTITY;
  if (exception instanceof UnauthorisedException)
    return HttpStatus.UNAUTHORIZED;
  if (exception instanceof HttpException) return exception.getStatus();
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/** Global exception filter — the only place that formats error responses. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly _logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = resolveStatus(exception);

    const code =
      exception instanceof AppException
        ? exception.code
        : exception instanceof HttpException
          ? 'HTTP_ERROR'
          : 'INTERNAL_ERROR';

    const message =
      status < 500
        ? exception instanceof Error
          ? exception.message
          : 'An error occurred'
        : 'Internal server error';

    if (status >= 500) {
      this._logger.error(
        { path: req.url, method: req.method, exception },
        'Unhandled exception',
      );
    }

    res.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
