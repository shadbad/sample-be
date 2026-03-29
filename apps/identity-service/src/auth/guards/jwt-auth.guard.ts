import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards routes that require a valid JWT Bearer token. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
