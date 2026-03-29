import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { Request } from 'express';
import { Observable, catchError, throwError } from 'rxjs';

/** Forwards requests to downstream microservices, injecting user context headers. */
@Injectable()
export class ProxyService {
  private readonly _logger = new Logger(ProxyService.name);

  constructor(private readonly _http: HttpService) {}

  /** Forward an HTTP request to a downstream service with user context headers. */
  forward(
    req: Request & { user?: { userId: string; email: string } },
    targetBaseUrl: string,
    overridePath?: string,
  ): Observable<AxiosResponse> {
    const path = overridePath ?? req.path;
    const url = `${targetBaseUrl}${path}`;

    const headers: Record<string, string> = {};
    if (req.user !== undefined) {
      headers['X-User-Id'] = req.user.userId;
      headers['X-User-Email'] = req.user.email;
    }
    if (req.headers['content-type'] !== undefined) {
      headers['content-type'] = req.headers['content-type'];
    }
    if (req.headers['authorization'] !== undefined) {
      headers['authorization'] = req.headers['authorization'];
    }
    if (req.headers['cookie'] !== undefined) {
      headers['cookie'] = req.headers['cookie'];
    }

    return this._http
      .request({
        method: req.method,
        url,
        params: req.query,
        data: req.body as unknown,
        headers,
        timeout: 10_000,
      })
      .pipe(
        catchError((error: AxiosError) => {
          const status = error.response?.status ?? 500;
          this._logger.error({ status, url, method: req.method }, 'Proxy error');
          return throwError(() => this._mapError(status));
        }),
      );
  }

  private _mapError(status: number): Error {
    if (status === 400) return new BadRequestException();
    if (status === 401) return new UnauthorizedException();
    if (status === 403) return new ForbiddenException();
    if (status === 404) return new NotFoundException();
    if (status === 409) return new ConflictException();
    if (status === 422) return new BadRequestException();
    return new InternalServerErrorException();
  }
}
