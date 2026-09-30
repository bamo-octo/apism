import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Utilisateur } from '../utilisateurs/utilisateur.js';
import { AUDIENCE, EMETTEUR, URL_CLES_PUBLIQUES } from './keycloak.js';

/** Vérifie la signature, l'émetteur, l'audience et l'expiration du jeton présenté dans `Authorization: Bearer <jeton>`. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: EMETTEUR,
      audience: AUDIENCE,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({ jwksUri: URL_CLES_PUBLIQUES, cache: true, rateLimit: true }),
    });
  }

  validate(payload: {
    sub: string;
    preferred_username?: string;
    resource_access?: Record<string, { roles: string[] }>;
  }): Utilisateur {
    return {
      id: payload.sub,
      nom: payload.preferred_username ?? payload.sub,
      permissions: payload.resource_access?.[AUDIENCE]?.roles ?? [],
    };
  }
}
