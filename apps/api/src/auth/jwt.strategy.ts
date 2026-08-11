import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type AuthenticatedUser = { id: string; workspaceId: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'development-only-secret-change-before-deploy'
    });
  }

  validate(payload: { sub: string; workspaceId: string }): AuthenticatedUser {
    return { id: payload.sub, workspaceId: payload.workspaceId };
  }
}
