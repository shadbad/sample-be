import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import type { FindAllOptions, IUserRepository } from './interfaces/user-repository.interface';
import { User } from './user.entity';

/** TypeORM implementation of IUserRepository. */
@Injectable()
export class UsersRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly _repo: Repository<User>,
  ) {}

  /** Return paginated users with optional search filter and dynamic sort order. */
  findAll(skip: number, take: number, options: FindAllOptions = {}): Promise<[User[], number]> {
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const where = search?.trim()
      ? [{ fullName: ILike(`%${search.trim()}%`) }, { email: ILike(`%${search.trim()}%`) }]
      : undefined;

    return this._repo.findAndCount({
      relations: { role: true },
      where,
      skip,
      take,
      order: { [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC' },
    });
  }

  /** Find user by primary key with role loaded. */
  findById(id: string): Promise<User | null> {
    return this._repo.findOne({
      where: { id },
      relations: { role: true },
    });
  }

  /** Find user by email — only selects id and email. */
  findByEmail(email: string): Promise<User | null> {
    return this._repo.findOne({ where: { email }, select: ['id', 'email'] });
  }

  /** Persist user (insert or update). */
  save(user: User): Promise<User> {
    return this._repo.save(user);
  }

  /** Soft-delete a user by primary key. */
  async softDelete(id: string): Promise<void> {
    await this._repo.softDelete(id);
  }
}
