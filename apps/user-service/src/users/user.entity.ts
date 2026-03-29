import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';

import { BaseEntity } from '@libs/core';

import { Role } from '../roles/role.entity';
import { UserResponseDto } from './dto/user-response.dto';

@Entity('users')
export class User extends BaseEntity {
  /** Supports: UsersRepository.findByEmail — uniqueness check */
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  fullName!: string;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @RelationId((user: User) => user.role)
  roleId!: string;

  /** Map to response DTO — only includes role if relation was loaded. */
  toResponseDto(): UserResponseDto {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      role: this.role ? { id: this.role.id, name: this.role.name } : { id: this.roleId, name: '' },
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
