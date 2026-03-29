import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from './user-response.dto';

export class PaginationMeta {
  @ApiProperty() readonly total!: number;
  @ApiProperty() readonly page!: number;
  @ApiProperty() readonly limit!: number;
  @ApiProperty() readonly totalPages!: number;
  @ApiProperty({ required: false, description: 'Active search filter, if any' })
  readonly search?: string;
  @ApiProperty({
    required: false,
    enum: ['fullName', 'email', 'createdAt'],
    description: 'Active sort column, if specified',
  })
  readonly sortBy?: string;
  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Active sort direction, if specified',
  })
  readonly sortOrder?: string;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] }) readonly data!: UserResponseDto[];
  @ApiProperty({ type: PaginationMeta }) readonly meta!: PaginationMeta;
}
