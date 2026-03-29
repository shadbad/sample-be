import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  IdentityUserRegisteredEvent,
  USER_EVENT_TYPES,
  USER_EVENTS_TOPIC,
  UserCreatedEvent,
  UserDeletedEvent,
  UserUpdatedEvent,
} from '@libs/contracts';
import { ConflictException, err, NotFoundException, ok, Result } from '@libs/core';
import { PubSubPublisherService } from '@libs/infra';

import { Role } from '../roles/role.entity';
import { RolesRepository } from '../roles/roles.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { I_USER_REPOSITORY } from './interfaces/user-repository.interface';
import { User } from './user.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Handles all user profile CRUD operations and Pub/Sub event publishing. */
@Injectable()
export class UsersService {
  private readonly _logger = new Logger(UsersService.name);

  constructor(
    @Inject(I_USER_REPOSITORY) private readonly _usersRepo: IUserRepository,
    private readonly _rolesRepo: RolesRepository,
    private readonly _pubSub: PubSubPublisherService,
  ) {}

  /** Return paginated list of users. */
  async findAll(
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  ): Promise<Result<PaginatedUsersResponseDto>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const [users, total] = await this._usersRepo.findAll(skip, safeLimit);
    return ok({
      data: users.map((u) => u.toResponseDto()),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  }

  /** Find one user by id with role loaded. */
  async findOne(id: string): Promise<Result<UserResponseDto>> {
    const user = await this._usersRepo.findById(id);
    if (user === null) {
      return err(new NotFoundException('User not found', { id }));
    }
    return ok(user.toResponseDto());
  }

  /** Create a new user profile and publish user.created event. */
  async create(dto: CreateUserDto): Promise<Result<UserResponseDto>> {
    const emailTaken = await this._usersRepo.findByEmail(dto.email);
    if (emailTaken !== null) {
      return err(new ConflictException('Email already taken', { email: dto.email }));
    }

    let role: Role | null = null;
    if (dto.roleId !== undefined) {
      role = await this._rolesRepo.findById(dto.roleId);
      if (role === null) {
        return err(new NotFoundException('Role not found', { roleId: dto.roleId }));
      }
    }

    const user = new User();
    user.email = dto.email;
    user.fullName = dto.fullName;
    if (role !== null) {
      user.role = role;
    }

    const saved = await this._usersRepo.save(user);

    const event: UserCreatedEvent = {
      eventType: USER_EVENT_TYPES.CREATED,
      occurredAt: new Date().toISOString(),
      payload: {
        userId: saved.id,
        email: saved.email,
        fullName: saved.fullName,
        ...(role !== null ? { roleId: role.id, roleName: role.name } : {}),
      },
    };
    await this._pubSub.publish(USER_EVENTS_TOPIC, event);

    return ok(saved.toResponseDto());
  }

  /** Update user fields and publish user.updated event. */
  async update(id: string, dto: UpdateUserDto): Promise<Result<UserResponseDto>> {
    const user = await this._usersRepo.findById(id);
    if (user === null) {
      return err(new NotFoundException('User not found', { id }));
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      const emailTaken = await this._usersRepo.findByEmail(dto.email);
      if (emailTaken !== null) {
        return err(new ConflictException('Email already taken', { email: dto.email }));
      }
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }

    let role: Role | null = user.role;
    if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
      const found = await this._rolesRepo.findById(dto.roleId);
      if (found === null) {
        return err(new NotFoundException('Role not found', { roleId: dto.roleId }));
      }
      user.role = found;
      role = found;
    }

    const saved = await this._usersRepo.save(user);

    const event: UserUpdatedEvent = {
      eventType: USER_EVENT_TYPES.UPDATED,
      occurredAt: new Date().toISOString(),
      payload: {
        userId: saved.id,
        email: saved.email,
        fullName: saved.fullName,
        ...(role !== null ? { roleId: role.id, roleName: role.name } : {}),
      },
    };
    await this._pubSub.publish(USER_EVENTS_TOPIC, event);

    return ok(saved.toResponseDto());
  }

  /** Soft-delete user and publish user.deleted event. */
  async remove(id: string): Promise<Result<void>> {
    const user = await this._usersRepo.findById(id);
    if (user === null) {
      return err(new NotFoundException('User not found', { id }));
    }

    await this._usersRepo.softDelete(id);

    const event: UserDeletedEvent = {
      eventType: USER_EVENT_TYPES.DELETED,
      occurredAt: new Date().toISOString(),
      payload: { userId: id },
    };
    await this._pubSub.publish(USER_EVENTS_TOPIC, event);

    return ok(undefined);
  }

  /**
   * Idempotent creation triggered by identity.user-registered event.
   * Does NOT publish a user.created event.
   */
  async createFromEvent(payload: IdentityUserRegisteredEvent['payload']): Promise<Result<void>> {
    const existing = await this._usersRepo.findById(payload.userId);
    if (existing !== null) {
      this._logger.log({ userId: payload.userId }, 'User already exists — skipping event');
      return ok(undefined);
    }

    let role: Role | null = null;
    if (payload.roleId !== undefined) {
      role = await this._rolesRepo.findById(payload.roleId);
      if (role === null) {
        return err(new NotFoundException('Role not found', { roleId: payload.roleId }));
      }
    }

    const user = new User();
    (user as unknown as Record<string, unknown>)['id'] = payload.userId;
    user.email = payload.email;
    user.fullName = payload.fullName;
    if (role !== null) {
      user.role = role;
    }

    await this._usersRepo.save(user);
    return ok(undefined);
  }
}
