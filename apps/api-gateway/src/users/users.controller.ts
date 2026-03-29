import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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

  /** Proxy GET /users — paginated list. */
  @Get()
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of users.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async listUsers(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, '/users');
  }

  /** Proxy POST /users — create a user profile. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user profile' })
  @ApiResponse({ status: 201, description: 'User profile created.' })
  @ApiResponse({ status: 409, description: 'Email already taken.' })
  async createUser(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, '/users');
  }

  /** Proxy GET /users/:id — fetch a single user. */
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('id') id: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    await this._pipe(req, res, `/users/${id}`);
  }

  /** Proxy PATCH /users/:id — partially update a user. */
  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a user' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this._pipe(req, res, `/users/${id}`);
  }

  /** Proxy DELETE /users/:id — soft-delete a user. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(
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
