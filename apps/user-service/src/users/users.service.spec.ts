import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

import { USER_EVENT_TYPES, USER_EVENTS_TOPIC } from '@libs/contracts';
import { ConflictException, NotFoundException } from '@libs/core';
import { PubSubPublisherService } from '@libs/infra';

import { Role } from '../roles/role.entity';
import { RolesRepository } from '../roles/roles.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  FindAllOptions,
  I_USER_REPOSITORY,
  IUserRepository,
} from './interfaces/user-repository.interface';
import { User } from './user.entity';
import { UsersService } from './users.service';

function makeRole(overrides: Partial<Role> = {}): Role {
  const role = new Role();
  (role as unknown as Record<string, unknown>)['id'] =
    overrides.id ?? '00000000-0000-0000-0000-000000000010';
  role.name = overrides.name ?? 'admin';
  return role;
}

function makeUser(overrides: Partial<User> = {}): User {
  const role = makeRole();
  const user = new User();
  (user as unknown as Record<string, unknown>)['id'] =
    (overrides as unknown as Record<string, unknown>)['id'] ?? 'user-uuid-1';
  user.email = overrides.email ?? 'user@example.com';
  user.fullName = overrides.fullName ?? 'Jane Doe';
  user.role = overrides.role ?? role;
  user.roleId = overrides.roleId ?? role.id;
  (user as unknown as Record<string, unknown>)['createdAt'] =
    overrides.createdAt ?? new Date('2024-01-01');
  (user as unknown as Record<string, unknown>)['updatedAt'] =
    overrides.updatedAt ?? new Date('2024-01-01');
  return user;
}

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: jest.Mocked<IUserRepository>;
  let rolesRepo: jest.Mocked<RolesRepository>;
  let pubSubService: jest.Mocked<PubSubPublisherService>;

  beforeEach(async () => {
    usersRepo = createMock<IUserRepository>();
    rolesRepo = createMock<RolesRepository>();
    pubSubService = createMock<PubSubPublisherService>();

    pubSubService.publish.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: I_USER_REPOSITORY, useValue: usersRepo },
        { provide: RolesRepository, useValue: rolesRepo },
        { provide: PubSubPublisherService, useValue: pubSubService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('given no options, when findAll is called, then it returns paginated users with default sort echoed in meta', async () => {
      const users = [makeUser(), makeUser({ email: 'b@example.com' })];
      usersRepo.findAll.mockResolvedValue([users, 2]);

      const result = await service.findAll(1, 10);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.total).toBe(2);
        expect(result.data.meta.page).toBe(1);
        expect(result.data.meta.limit).toBe(10);
        expect(result.data.meta.totalPages).toBe(1);
        expect(result.data.data).toHaveLength(2);
      }
      expect(usersRepo.findAll).toHaveBeenCalledWith(0, 10, {});
    });

    it('given search option, when findAll is called, then it passes search through and echoes in meta', async () => {
      const users = [makeUser({ fullName: 'Alice Smith' })];
      usersRepo.findAll.mockResolvedValue([users, 1]);

      const options: FindAllOptions = { search: 'alice' };
      const result = await service.findAll(1, 10, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.search).toBe('alice');
        expect(result.data.meta.total).toBe(1);
      }
      expect(usersRepo.findAll).toHaveBeenCalledWith(0, 10, options);
    });

    it('given sortBy and sortOrder options, when findAll is called, then they are echoed in meta', async () => {
      usersRepo.findAll.mockResolvedValue([[], 0]);

      const options: FindAllOptions = { sortBy: 'fullName', sortOrder: 'asc' };
      const result = await service.findAll(1, 20, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta.sortBy).toBe('fullName');
        expect(result.data.meta.sortOrder).toBe('asc');
      }
    });

    it('given a page > 1, when findAll is called, then it computes the correct skip', async () => {
      usersRepo.findAll.mockResolvedValue([[], 15]);

      await service.findAll(2, 5);

      expect(usersRepo.findAll).toHaveBeenCalledWith(5, 5, {});
    });

    it('given limit over MAX_LIMIT, when findAll is called, then it clamps to 100', async () => {
      usersRepo.findAll.mockResolvedValue([[], 0]);

      await service.findAll(1, 9999);

      expect(usersRepo.findAll).toHaveBeenCalledWith(0, 100, {});
    });
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'new@example.com',
      fullName: 'New User',
      roleId: '00000000-0000-0000-0000-000000000010',
    };

    const dtoNoRole: CreateUserDto = {
      email: 'norole@example.com',
      fullName: 'No Role User',
    };

    it('given an email already taken, when create is called, then it returns a ConflictException result', async () => {
      usersRepo.findByEmail.mockResolvedValue(makeUser({ email: dto.email }));

      const result = await service.create(dto);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConflictException);
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('given a roleId that does not exist, when create is called, then it returns a NotFoundException result', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);
      rolesRepo.findById.mockResolvedValue(null);

      const result = await service.create(dto);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundException);
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('given valid data, when create is called, then it saves user and publishes user.created event', async () => {
      const role = makeRole();
      const savedUser = makeUser({ email: dto.email, fullName: dto.fullName, role });
      usersRepo.findByEmail.mockResolvedValue(null);
      rolesRepo.findById.mockResolvedValue(role);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.create(dto);

      expect(result.success).toBe(true);
      expect(usersRepo.save).toHaveBeenCalledTimes(1);
      expect(pubSubService.publish).toHaveBeenCalledWith(
        USER_EVENTS_TOPIC,
        expect.objectContaining({
          eventType: USER_EVENT_TYPES.CREATED,
          payload: expect.objectContaining({
            email: dto.email,
            fullName: dto.fullName,
            roleId: role.id,
            roleName: role.name,
          }),
        }),
      );
    });

    it('given no roleId, when create is called, then it saves user with null role and publishes event without roleId', async () => {
      const savedUser = makeUser({
        email: dtoNoRole.email,
        fullName: dtoNoRole.fullName,
        role: null as unknown as Role,
      });
      usersRepo.findByEmail.mockResolvedValue(null);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.create(dtoNoRole);

      expect(result.success).toBe(true);
      expect(rolesRepo.findById).not.toHaveBeenCalled();
      expect(usersRepo.save).toHaveBeenCalledTimes(1);
      expect(pubSubService.publish).toHaveBeenCalledWith(
        USER_EVENTS_TOPIC,
        expect.objectContaining({
          eventType: USER_EVENT_TYPES.CREATED,
          payload: expect.not.objectContaining({ roleId: expect.anything() }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = { fullName: 'Updated Name' };

    it('given a userId that does not exist, when update is called, then it returns a NotFoundException result', async () => {
      usersRepo.findById.mockResolvedValue(null);

      const result = await service.update('nonexistent-id', updateDto);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundException);
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('given valid changes, when update is called, then it publishes user.updated event', async () => {
      const role = makeRole();
      const user = makeUser({ role });
      const savedUser = makeUser({ ...user, fullName: 'Updated Name', role });
      usersRepo.findById.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.update('user-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(pubSubService.publish).toHaveBeenCalledWith(
        USER_EVENTS_TOPIC,
        expect.objectContaining({
          eventType: USER_EVENT_TYPES.UPDATED,
          payload: expect.objectContaining({ userId: savedUser.id }),
        }),
      );
    });

    it('given roleId: null, when update is called, then it clears the role and publishes event without roleId', async () => {
      const role = makeRole();
      const user = makeUser({ role });
      const savedUser = makeUser({
        ...user,
        role: null as unknown as Role,
        roleId: null as unknown as string,
      });
      usersRepo.findById.mockResolvedValue(user);
      usersRepo.save.mockImplementation((u) => Promise.resolve(u));
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.update('user-uuid-1', { roleId: null });

      expect(result.success).toBe(true);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: null }));
      expect(pubSubService.publish).toHaveBeenCalledWith(
        USER_EVENTS_TOPIC,
        expect.objectContaining({
          eventType: USER_EVENT_TYPES.UPDATED,
          payload: expect.not.objectContaining({ roleId: expect.anything() }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('given a valid userId, when remove is called, then it soft-deletes and publishes user.deleted event', async () => {
      const user = makeUser();
      usersRepo.findById.mockResolvedValue(user);
      usersRepo.softDelete.mockResolvedValue(undefined);

      const result = await service.remove('user-uuid-1');

      expect(result.success).toBe(true);
      expect(usersRepo.softDelete).toHaveBeenCalledWith('user-uuid-1');
      expect(pubSubService.publish).toHaveBeenCalledWith(
        USER_EVENTS_TOPIC,
        expect.objectContaining({
          eventType: USER_EVENT_TYPES.DELETED,
          payload: { userId: 'user-uuid-1' },
        }),
      );
    });

    it('given an unknown userId, when remove is called, then it returns a NotFoundException result', async () => {
      usersRepo.findById.mockResolvedValue(null);

      const result = await service.remove('unknown-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('createFromEvent', () => {
    const payload = {
      userId: 'event-user-uuid',
      email: 'event@example.com',
      fullName: 'Event User',
      roleId: '00000000-0000-0000-0000-000000000010',
    };

    const payloadNoRole = {
      userId: 'event-norole-uuid',
      email: 'norole@example.com',
      fullName: 'No Role Event User',
    };

    it('given a userId that already exists, when createFromEvent is called, then it returns ok without saving again', async () => {
      usersRepo.findById.mockResolvedValue(makeUser({ email: payload.email }));

      const result = await service.createFromEvent(payload);

      expect(result.success).toBe(true);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('given a new userId, when createFromEvent is called, then it does NOT publish a user.created event', async () => {
      const role = makeRole({ id: payload.roleId });
      usersRepo.findById.mockResolvedValue(null);
      rolesRepo.findById.mockResolvedValue(role);
      usersRepo.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.createFromEvent(payload);

      expect(result.success).toBe(true);
      expect(usersRepo.save).toHaveBeenCalledTimes(1);
      expect(pubSubService.publish).not.toHaveBeenCalledWith(
        USER_EVENTS_TOPIC,
        expect.objectContaining({ eventType: USER_EVENT_TYPES.CREATED }),
      );
    });

    it('given a payload without roleId, when createFromEvent is called, then it saves user with null role', async () => {
      usersRepo.findById.mockResolvedValue(null);
      usersRepo.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.createFromEvent(payloadNoRole);

      expect(result.success).toBe(true);
      expect(rolesRepo.findById).not.toHaveBeenCalled();
      expect(usersRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
