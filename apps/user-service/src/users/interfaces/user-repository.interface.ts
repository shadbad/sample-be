import { User } from '../user.entity';

export const I_USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findAll(skip: number, take: number): Promise<[User[], number]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  softDelete(id: string): Promise<void>;
}
