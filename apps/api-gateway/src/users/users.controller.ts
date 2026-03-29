import { All, Controller, HttpException, HttpStatus, Param, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

import { ProxyService } from '../proxy/proxy.service';

/** Proxies all /users requests to the user-service. All routes require JWT. */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private readonly _userServiceUrl: string;

  constructor(
    private readonly _proxy: ProxyService,
    config: ConfigService,
  ) {
    this._userServiceUrl = config.getOrThrow<string>('USER_SERVICE_URL');
  }

  /** Proxy GET /users and POST /users. */
  @All()
  async handleCollection(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, '/users');
  }

  /** Proxy GET /users/:id, PATCH /users/:id, DELETE /users/:id. */
  @All(':id')
  async handleResource(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this._pipe(req, res, `/users/${id}`);
  }

  private async _pipe(req: Request, res: Response, path: string): Promise<void> {
    try {
      const upstream = await firstValueFrom(
        this._proxy.forward(
          req as Request & { user?: { userId: string; email: string } },
          this._userServiceUrl,
          path,
        ),
      );
      res.status(upstream.status).json(upstream.data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Bad gateway', HttpStatus.BAD_GATEWAY);
    }
  }
}
