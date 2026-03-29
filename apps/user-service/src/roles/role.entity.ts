import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '@libs/core';

import { User } from '../users/user.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
