import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './role.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(Role)
    private readonly _repo: Repository<Role>,
  ) {}

  /** Find a role by its primary key. */
  findById(id: string): Promise<Role | null> {
    return this._repo.findOne({ where: { id } });
  }
}
