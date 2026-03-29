import { ApiProperty } from '@nestjs/swagger';

/** Response shape returned by register, login, and refresh endpoints. */
export class AuthResponseDto {
  @ApiProperty()
  readonly accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  readonly tokenType = 'Bearer' as const;

  @ApiProperty({ example: 900 })
  readonly expiresIn!: number;
}
