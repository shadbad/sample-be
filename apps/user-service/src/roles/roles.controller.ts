import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RolesRepository } from './roles.repository';

/** Returns the list of available roles. */
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly _rolesRepo: RolesRepository) {}

  /** Return all roles. */
  @Get()
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Array of role objects.' })
  async findAll(): Promise<{ id: string; name: string }[]> {
    const roles = await this._rolesRepo.findAll();
    return roles.map((r) => ({ id: r.id, name: r.name }));
  }
}
