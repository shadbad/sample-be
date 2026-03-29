import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Abstract base for all ORM entities — provides id, timestamps, soft-delete. */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @CreateDateColumn()
  readonly createdAt!: Date;

  @UpdateDateColumn()
  readonly updatedAt!: Date;

  @DeleteDateColumn()
  readonly deletedAt!: Date | null;
}
