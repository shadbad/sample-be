import { Controller, Get, HttpException, HttpStatus, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

import { ProxyService } from '../proxy/proxy.service';

/** Proxies /roles requests to the user-service. All routes require JWT. */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  private readonly _userServiceUrl: string;

  constructor(
    private readonly _proxy: ProxyService,
    config: ConfigService,
  ) {
    this._userServiceUrl = config.getOrThrow<string>('USER_SERVICE_URL');
  }

  /** Proxy GET /roles — list all available roles. */
  @Get()
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Array of role objects.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async listRoles(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const upstream = await firstValueFrom(
        this._proxy.forward(
          req as Request & { user?: { userId: string; email: string } },
          this._userServiceUrl,
          '/roles',
        ),
      );
      res.status(upstream.status).json(upstream.data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Bad gateway', HttpStatus.BAD_GATEWAY);
    }
  }
}
