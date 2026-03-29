import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import {
  ConflictException,
  NotFoundException,
  UnauthorisedException,
  ValidationException,
} from '../exceptions/app.exception';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockHost: ArgumentsHost;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter = new AllExceptionsFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    const mockResponse = { status: mockStatus } as unknown as Response;
    const mockRequest = {
      url: '/test-path',
      method: 'GET',
    } as unknown as Request;
    const mockHttpContext = {
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('catch — status code mapping', () => {
    it('given a NotFoundException, when catch is called, then it responds with HTTP 404', () => {
      filter.catch(new NotFoundException('User not found'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('given a ConflictException, when catch is called, then it responds with HTTP 409', () => {
      filter.catch(new ConflictException('Email already taken'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('given a ValidationException, when catch is called, then it responds with HTTP 422', () => {
      filter.catch(new ValidationException('Invalid input'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('given an UnauthorisedException, when catch is called, then it responds with HTTP 401', () => {
      filter.catch(new UnauthorisedException('Token expired'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it("given a NestJS HttpException, when catch is called, then it responds with that exception's status", () => {
      filter.catch(new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('given an unknown Error, when catch is called, then it responds with HTTP 500', () => {
      filter.catch(new Error('Unexpected failure'), mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('catch — error code in response body', () => {
    it('given a NotFoundException, when catch is called, then the response body contains code NOT_FOUND', () => {
      filter.catch(new NotFoundException('Not found'), mockHost);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 'NOT_FOUND' }));
    });

    it('given a NestJS HttpException, when catch is called, then the response body contains code HTTP_ERROR', () => {
      filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), mockHost);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 'HTTP_ERROR' }));
    });

    it('given an unknown Error, when catch is called, then the response body contains code INTERNAL_ERROR', () => {
      filter.catch(new Error('Unknown'), mockHost);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
    });
  });

  describe('catch — message in response body', () => {
    it('given a 4xx AppException, when catch is called, then the response body contains the exception message', () => {
      filter.catch(new NotFoundException('Resource not found'), mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Resource not found' }),
      );
    });

    it('given a 5xx unknown error, when catch is called, then the response body contains a generic message', () => {
      filter.catch(new Error('DB connection lost'), mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    });

    it('given a non-Error unknown exception, when catch is called, then the response body falls back to the generic message', () => {
      filter.catch('string exception', mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    });
  });

  describe('catch — response metadata', () => {
    it('given any exception, when catch is called, then the response body includes path and a timestamp', () => {
      filter.catch(new NotFoundException('not found'), mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test-path',
          timestamp: expect.any(String) as string,
        }),
      );
    });
  });

  describe('catch — logging', () => {
    it('given a 5xx error, when catch is called, then Logger.error is invoked', () => {
      filter.catch(new Error('Crash'), mockHost);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('given a 4xx AppException, when catch is called, then Logger.error is not invoked', () => {
      filter.catch(new NotFoundException('Not found'), mockHost);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('given an UnauthorisedException, when catch is called, then Logger.error is not invoked', () => {
      filter.catch(new UnauthorisedException('Not authenticated'), mockHost);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });
});
