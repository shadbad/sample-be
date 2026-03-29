import { All, Controller, HttpException, HttpStatus, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

import { Public } from '../auth/decorators/public.decorator';
import { ProxyService } from '../proxy/proxy.service';

/** Proxies all /auth requests to the identity-service. */
@Controller('auth')
export class IdentityController {
  private readonly _identityServiceUrl: string;

  constructor(
    private readonly _proxy: ProxyService,
    config: ConfigService,
  ) {
    this._identityServiceUrl = config.getOrThrow<string>('IDENTITY_SERVICE_URL');
  }

  /** Proxy POST /auth/register — public. */
  @Public()
  @All('register')
  async register(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/register`);
  }

  /** Proxy POST /auth/login — public. */
  @Public()
  @All('login')
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/login`);
  }

  /** Proxy POST /auth/refresh — public (token in cookie, not bearer). */
  @Public()
  @All('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/refresh`);
  }

  /** Proxy POST /auth/logout — protected. */
  @All('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/logout`);
  }

  private async _pipe(req: Request, res: Response, path: string): Promise<void> {
    try {
      const upstream = await firstValueFrom(
        this._proxy.forward(
          req as Request & { user?: { userId: string; email: string } },
          this._identityServiceUrl,
          path,
        ),
      );
      const setCookie = upstream.headers['set-cookie'];
      if (setCookie !== undefined) {
        res.setHeader('Set-Cookie', setCookie);
      }
      res.status(upstream.status).json(upstream.data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Bad gateway', HttpStatus.BAD_GATEWAY);
    }
  }
}
