import { ApiProperty } from '@nestjs/swagger';

/** Shape of a role embedded in a user response. */
export class RoleDto {
  @ApiProperty() readonly id!: string;
  @ApiProperty() readonly name!: string;
}

export class UserResponseDto {
  @ApiProperty() readonly id!: string;
  @ApiProperty() readonly email!: string;
  @ApiProperty() readonly fullName!: string;
  @ApiProperty({ type: RoleDto, nullable: true }) readonly role!: RoleDto | null;
  @ApiProperty() readonly createdAt!: string;
  @ApiProperty() readonly updatedAt!: string;
}
