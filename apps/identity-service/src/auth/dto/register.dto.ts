import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** DTO for the POST /auth/register endpoint. */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({ example: 'Jane Doe', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly fullName!: string;

  @ApiProperty({ example: 'SecurePass1!', minLength: 8 })
  @IsString()
  @MinLength(8)
  readonly password!: string;
}
