import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** JWT payload shape produced by identity-service AuthService. */
interface JwtPayload {
  sub: string;
  email: string;
}

/** Authenticated user context attached to req.user after validation. */
interface AuthenticatedUser {
  userId: string;
  email: string;
}

/** Validates Bearer JWTs on authenticated routes. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  /** Map the verified JWT payload to the authenticated user context. */
  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
