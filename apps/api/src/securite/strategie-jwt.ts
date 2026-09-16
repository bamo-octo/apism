import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { ConfigurationMyBrew } from '../configuration/configuration.js';
import { construireUtilisateur, type ChargeUtileJeton, type Utilisateur } from './utilisateur.js';

/**
 * Validation locale du jeton d'acces emis par Keycloak.
 *
 * L'API ne fait jamais d'appel a Keycloak pour valider un jeton : elle
 * telecharge (et met en cache) les cles publiques du realm via le JWKS, puis
 * verifie la signature, l'emetteur, l'audience et l'expiration.
 */
@Injectable()
export class StrategieJwt extends PassportStrategy(Strategy, 'jwt') {
  private static readonly journal = new Logger(StrategieJwt.name);

  constructor(configuration: ConfigService<ConfigurationMyBrew, true>) {
    const securite = configuration.get('securite', { infer: true });

    StrategieJwt.journal.log(`Emetteur attendu : ${securite.emetteur}`);
    StrategieJwt.journal.log(`Cles publiques (JWKS) : ${securite.urlJwks}`);
    StrategieJwt.journal.log(`Audience attendue : ${securite.audience}`);

    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      issuer: securite.emetteur,
      audience: securite.audience,
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: securite.urlJwks,
        cache: true,
        cacheMaxAge: 600_000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }),
    };

    super(options);
  }

  validate(charge: ChargeUtileJeton): Utilisateur {
    return construireUtilisateur(charge);
  }
}
