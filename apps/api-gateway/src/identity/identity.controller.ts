import { Controller, HttpCode, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

import { Public } from '../auth/decorators/public.decorator';
import { ProxyService } from '../proxy/proxy.service';

/** Proxies all /auth requests to the identity-service. */
@ApiTags('auth')
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
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user credential' })
  @ApiResponse({ status: 201, description: 'User registered; returns access token.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  async register(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/register`);
  }

  /** Proxy POST /auth/login — public. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access token' })
  @ApiResponse({ status: 200, description: 'Returns access token; sets refresh-token cookie.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/login`);
  }

  /** Proxy POST /auth/refresh — public (token in cookie, not bearer). */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({
    status: 200,
    description: 'Returns new access token; rotates refresh-token cookie.',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/auth/refresh`);
  }

  /** Proxy POST /auth/logout — protected. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate refresh token and sign out' })
  @ApiResponse({ status: 204, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
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
