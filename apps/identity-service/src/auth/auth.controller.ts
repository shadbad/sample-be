import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { mapException } from '@libs/core';

import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE = 'refresh_token';

/** Auth endpoints — register, login, refresh, logout. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  /** Register a new user credential and return an access token. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user credential' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<{ data: AuthResponseDto }> {
    const result = await this._authService.register(dto);
    if (!result.success) throw mapException(result.error);
    return { data: result.data.auth };
  }

  /** Authenticate and return an access token + set refresh token cookie. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: AuthResponseDto }> {
    const result = await this._authService.login(dto);
    if (!result.success) throw mapException(result.error);

    res.cookie(REFRESH_COOKIE, result.data.rawRefreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });

    return { data: result.data.auth };
  }

  /** Rotate refresh token and issue a new access token. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: AuthResponseDto }> {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (rawRefreshToken === undefined) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this._authService.refresh(rawRefreshToken);
    if (!result.success) throw mapException(result.error);

    res.cookie(REFRESH_COOKIE, result.data.rawRefreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });

    return { data: result.data.auth };
  }

  /** Invalidate the refresh token for the authenticated user. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @Req() req: Request & { user?: { userId: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const userId = req.user?.userId;
    if (userId === undefined) {
      throw new UnauthorizedException('Not authenticated');
    }

    const result = await this._authService.logout(userId);
    if (!result.success) throw mapException(result.error);

    res.clearCookie(REFRESH_COOKIE);
  }
}
