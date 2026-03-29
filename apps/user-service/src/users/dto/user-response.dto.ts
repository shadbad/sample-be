import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty() readonly id!: string;
  @ApiProperty() readonly email!: string;
  @ApiProperty() readonly fullName!: string;
  @ApiProperty() readonly role!: { id: string; name: string };
  @ApiProperty() readonly createdAt!: string;
  @ApiProperty() readonly updatedAt!: string;
}
