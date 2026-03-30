import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { FindAllOptions, IUserRepository } from './interfaces/user-repository.interface';
import { User } from './user.entity';

/** Columns where ordering should be case-insensitive (text fields). */
const CASE_INSENSITIVE_SORT_COLS = new Set(['fullName', 'email']);

/**
 * SQL expressions to use inside LOWER() for case-insensitive sort.
 * Uses fully-qualified double-quoted identifiers matching the DB column names.
 */
const LOWER_EXPR: Record<string, string> = {
  fullName: `"user"."fullName"`,
  email: `"user"."email"`,
};

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
    const direction = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    const term = search?.trim();

    const qb = this._repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .skip(skip)
      .take(take);

    if (term) {
      qb.where('user.fullName ILIKE :term OR user.email ILIKE :term', {
        term: `%${term}%`,
      });
    }

    if (CASE_INSENSITIVE_SORT_COLS.has(sortBy)) {
      // Project a LOWER() alias and sort by it for case-insensitive ordering.
      const colExpr = LOWER_EXPR[sortBy] ?? `"user"."${sortBy}"`;
      qb.addSelect(`LOWER(${colExpr})`, '_sort_key').orderBy('_sort_key', direction);
    } else {
      qb.orderBy(`user.${sortBy}`, direction);
    }

    return qb.getManyAndCount();
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
