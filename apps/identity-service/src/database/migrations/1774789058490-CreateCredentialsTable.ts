import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCredentialsTable1774789058490 implements MigrationInterface {
    name = 'CreateCredentialsTable1774789058490'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "credentials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "refreshTokenHash" character varying(255), "lastLoginAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_8d3a07b8e994962efe57ebd0f20" UNIQUE ("userId"), CONSTRAINT "PK_1e38bc43be6697cdda548ad27a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c286aa8e09ecff5cc756ee8321" ON "credentials" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c286aa8e09ecff5cc756ee8321"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
    }

}
