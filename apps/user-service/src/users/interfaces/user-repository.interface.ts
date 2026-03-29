import { User } from '../user.entity';

export const I_USER_REPOSITORY = Symbol('IUserRepository');

/** Allowed sort columns for user listings. */
export type UserSortField = 'fullName' | 'email' | 'createdAt';

/** Sort direction for user listings. */
export type SortOrder = 'asc' | 'desc';

/** Optional filters and ordering applied to {@link IUserRepository.findAll}. */
export interface FindAllOptions {
  /** Case-insensitive substring match against fullName OR email. Ignored when undefined or empty. */
  readonly search?: string;
  /** Column to sort by. Defaults to 'createdAt'. */
  readonly sortBy?: UserSortField;
  /** Sort direction. Defaults to 'desc'. */
  readonly sortOrder?: SortOrder;
}

export interface IUserRepository {
  findAll(skip: number, take: number, options?: FindAllOptions): Promise<[User[], number]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  softDelete(id: string): Promise<void>;
}
