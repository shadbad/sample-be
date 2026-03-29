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
import type { SortOrder, UserSortField } from './interfaces/user-repository.interface';
import { UsersService } from './users.service';

/** Helper — maps Result errors to NestJS HTTP exceptions. */
function throwMapped(error: AppException): never {
  throw mapException(error);
}

const VALID_SORT_FIELDS = new Set<string>(['fullName', 'email', 'createdAt']);
const VALID_SORT_ORDERS = new Set<string>(['asc', 'desc']);

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly _usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination, search, and sort' })
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
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Case-insensitive substring match on fullName or email',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['fullName', 'email', 'createdAt'],
    description: 'Column to sort by (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction (default: desc)',
  })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginatedUsersResponseDto> {
    const result = await this._usersService.findAll(
      page !== undefined ? parseInt(page, 10) : undefined,
      limit !== undefined ? parseInt(limit, 10) : undefined,
      {
        search: search?.trim() || undefined,
        sortBy: VALID_SORT_FIELDS.has(sortBy ?? '') ? (sortBy as UserSortField) : undefined,
        sortOrder: VALID_SORT_ORDERS.has(sortOrder ?? '') ? (sortOrder as SortOrder) : undefined,
      },
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
