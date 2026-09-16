import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import type { ConfigurationMyBrew } from '../configuration/configuration.js';
import { GardeAutorisation } from './garde-autorisation.js';
import { GardeJwt } from './garde-jwt.js';
import { StrategieJwt } from './strategie-jwt.js';

/**
 * Module de securite de l'API.
 *
 * La strategie JWT n'est enregistree que si la securite est activee : cela
 * permet de demarrer l'API en mode "non securise" (etape 1 du TP) sans que
 * l'API n'exige un Keycloak joignable.
 */
@Module({
  imports: [PassportModule],
  providers: [
    {
      provide: StrategieJwt,
      inject: [ConfigService],
      useFactory: (configuration: ConfigService<ConfigurationMyBrew, true>) =>
        configuration.get('securite', { infer: true }).activee
          ? new StrategieJwt(configuration)
          : null,
    },
    { provide: APP_GUARD, useClass: GardeJwt },
    { provide: APP_GUARD, useClass: GardeAutorisation },
  ],
})
export class SecuriteModule {}
