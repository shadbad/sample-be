import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUserRoleNullable1743206400000 implements MigrationInterface {
  name = 'MakeUserRoleNullable1743206400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing FK constraint
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"`,
    );
    // Allow NULL on roleId
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roleId" DROP NOT NULL`);
    // Recreate FK with ON DELETE SET NULL
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }
}
