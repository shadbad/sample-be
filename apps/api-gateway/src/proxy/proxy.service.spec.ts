import { createMock } from '@golevelup/ts-jest';
import { HttpService } from '@nestjs/axios';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import type { Request } from 'express';
import { firstValueFrom, of, throwError } from 'rxjs';

import { ProxyService } from './proxy.service';

function makeAxiosError(status: number): AxiosError {
  const err = new AxiosError('error');
  err.response = { status } as AxiosResponse;
  return err;
}

function makeRequest(
  overrides: Partial<Request & { user?: { userId: string; email: string } }> = {},
): Request & { user?: { userId: string; email: string } } {
  return {
    method: 'GET',
    path: '/users',
    query: {},
    headers: {},
    body: undefined,
    ...overrides,
  } as Request & { user?: { userId: string; email: string } };
}

describe('ProxyService', () => {
  let service: ProxyService;
  let http: jest.Mocked<HttpService>;

  beforeEach(() => {
    http = createMock<HttpService>();
    service = new ProxyService(http);
  });

  describe('forward', () => {
    it('given a successful upstream response, when forward is called, then it resolves with the upstream data', async () => {
      const mockResponse = { status: 200, data: { id: '1' } } as AxiosResponse;
      http.request.mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(
        service.forward(makeRequest(), 'http://user-service:3001', '/users'),
      );

      expect(result).toBe(mockResponse);
    });

    it('given an authenticated user, when forward is called, then it injects X-User-Id and X-User-Email headers', async () => {
      const mockResponse = { status: 200, data: {} } as AxiosResponse;
      http.request.mockReturnValue(of(mockResponse));
      const req = makeRequest({ user: { userId: 'uid-1', email: 'a@b.com' } });

      await firstValueFrom(service.forward(req, 'http://user-service:3001', '/users'));

      const callArgs = http.request.mock.calls[0]?.[0];
      expect((callArgs?.headers as Record<string, string>)?.['X-User-Id']).toBe('uid-1');
      expect((callArgs?.headers as Record<string, string>)?.['X-User-Email']).toBe('a@b.com');
    });

    it('given an upstream 404, when forward is called, then it throws NotFoundException', async () => {
      http.request.mockReturnValue(throwError(() => makeAxiosError(404)));

      await expect(
        firstValueFrom(service.forward(makeRequest(), 'http://user-service:3001')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('given an upstream 401, when forward is called, then it throws UnauthorizedException', async () => {
      http.request.mockReturnValue(throwError(() => makeAxiosError(401)));

      await expect(
        firstValueFrom(service.forward(makeRequest(), 'http://user-service:3001')),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('given an upstream 500, when forward is called, then it throws InternalServerErrorException', async () => {
      http.request.mockReturnValue(throwError(() => makeAxiosError(500)));

      await expect(
        firstValueFrom(service.forward(makeRequest(), 'http://user-service:3001')),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('given no upstream response, when forward is called, then it throws InternalServerErrorException', async () => {
      const err = new AxiosError('network error');
      // no err.response set — simulates network failure
      http.request.mockReturnValue(throwError(() => err));

      await expect(
        firstValueFrom(service.forward(makeRequest(), 'http://user-service:3001')),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
