import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty() @IsEmail() readonly email!: string;

  @ApiProperty({ minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly fullName!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === 'null' ? null : value))
  @ValidateIf((o: { roleId?: string | null }) => o.roleId !== null)
  @IsUUID()
  readonly roleId?: string | null;
}
