import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateRolesAndUsersTable1710000000002 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar', length: '50', isUnique: true, isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );

    // Supports: RolesRepository.findByName
    await qr.createIndex(
      'roles',
      new TableIndex({ name: 'IDX_roles_name', columnNames: ['name'], isUnique: true }),
    );

    await qr.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'email', type: 'varchar', length: '255', isUnique: true, isNullable: false },
          { name: 'fullName', type: 'varchar', length: '255', isNullable: false },
          { name: 'roleId', type: 'uuid', isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );

    // Supports: UsersRepository.findByEmail — uniqueness check
    await qr.createIndex(
      'users',
      new TableIndex({ name: 'IDX_users_email', columnNames: ['email'], isUnique: true }),
    );
    // Supports: UsersRepository join on role
    await qr.createIndex(
      'users',
      new TableIndex({ name: 'IDX_users_roleId', columnNames: ['roleId'] }),
    );

    await qr.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_users_roleId',
        columnNames: ['roleId'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.dropForeignKey('users', 'FK_users_roleId');
    await qr.dropTable('users');
    await qr.dropTable('roles');
  }
}
