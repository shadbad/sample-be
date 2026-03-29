import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

/** DTO for the POST /auth/login endpoint. */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({ example: 'SecurePass1!' })
  @IsString()
  readonly password!: string;
}
