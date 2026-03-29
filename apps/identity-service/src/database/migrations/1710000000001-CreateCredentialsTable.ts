import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Creates the credentials table with all required indexes. */
export class CreateCredentialsTable1710000000001 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.createTable(
      new Table({
        name: 'credentials',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'refreshTokenHash',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'lastLoginAt', type: 'timestamp', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );

    // Supports: IAuthRepository.findByEmail — login flow
    await qr.createIndex(
      'credentials',
      new TableIndex({
        name: 'IDX_credentials_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
    // Supports: IAuthRepository.findByUserId — logout, token refresh
    await qr.createIndex(
      'credentials',
      new TableIndex({
        name: 'IDX_credentials_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );
    // Supports: IAuthRepository.findByRefreshTokenHash — token rotation
    await qr.createIndex(
      'credentials',
      new TableIndex({
        name: 'IDX_credentials_refreshTokenHash',
        columnNames: ['refreshTokenHash'],
      }),
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.dropTable('credentials');
  }
}
