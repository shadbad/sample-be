import 'reflect-metadata';

import { Role } from '../../roles/role.entity';
import { User } from '../../users/user.entity';
import { AppDataSource } from '../data-source';
import { DEFAULT_ROLES } from './data/roles.seed';
import { DEFAULT_USERS } from './data/users.seed';

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);

  for (const roleSeed of DEFAULT_ROLES) {
    const exists = await roleRepo.findOne({ where: { id: roleSeed.id } });
    if (exists === null) {
      await roleRepo.save(Object.assign(new Role(), roleSeed));
      console.log(`Role '${roleSeed.name}' seeded.`);
    } else {
      console.log(`Role '${roleSeed.name}' already exists.`);
    }
  }

  for (const userSeed of DEFAULT_USERS) {
    const exists = await userRepo.findOne({ where: { id: userSeed.id } });
    if (exists === null) {
      const roleId = 'roleId' in userSeed ? userSeed.roleId : undefined;
      const role = roleId ? await roleRepo.findOne({ where: { id: roleId } }) : null;
      if (roleId && role === null) throw new Error(`Role ${roleId} not found`);
      const user = new User();
      Object.assign(user, {
        id: userSeed.id,
        email: userSeed.email,
        fullName: userSeed.fullName,
        role,
      });
      await userRepo.save(user);
      console.log(`User '${userSeed.email}' seeded.`);
    } else {
      console.log(`User '${userSeed.email}' already exists.`);
    }
  }

  await AppDataSource.destroy();
}

void seed();
