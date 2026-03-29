import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IUserRepository } from './interfaces/user-repository.interface';
import { User } from './user.entity';

/** TypeORM implementation of IUserRepository. */
@Injectable()
export class UsersRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly _repo: Repository<User>,
  ) {}

  /** Return paginated users with role relation. */
  findAll(skip: number, take: number): Promise<[User[], number]> {
    return this._repo.findAndCount({
      relations: { role: true },
      skip,
      take,
      order: { createdAt: 'DESC' },
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
