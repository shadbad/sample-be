import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppException, mapException } from '@libs/core';

import { CreateUserDto } from './dto/create-user.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

/** Helper — maps Result errors to NestJS HTTP exceptions. */
function throwMapped(error: AppException): never {
  throw mapException(error);
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly _usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedUsersResponseDto> {
    const result = await this._usersService.findAll(
      page !== undefined ? parseInt(page, 10) : undefined,
      limit !== undefined ? parseInt(limit, 10) : undefined,
    );
    if (!result.success) throwMapped(result.error);
    return result.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<{ data: UserResponseDto }> {
    const result = await this._usersService.findOne(id);
    if (!result.success) throwMapped(result.error);
    return { data: result.data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user profile' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already taken' })
  async create(@Body() dto: CreateUserDto): Promise<{ data: UserResponseDto }> {
    const result = await this._usersService.create(dto);
    if (!result.success) throwMapped(result.error);
    return { data: result.data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<{ data: UserResponseDto }> {
    const result = await this._usersService.update(id, dto);
    if (!result.success) throwMapped(result.error);
    return { data: result.data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    const result = await this._usersService.remove(id);
    if (!result.success) throwMapped(result.error);
  }
}
