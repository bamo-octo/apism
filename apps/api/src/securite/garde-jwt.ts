import {
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import type { ConfigurationMyBrew } from '../configuration/configuration.js';
import { CLE_PUBLIC } from './decorateurs.js';

/**
 * Garde globale : exige un jeton d'acces valide, sauf sur les routes marquees
 * `@Public()`. Peut etre neutralisee via `SECURITE_ACTIVEE=false` pour
 * retrouver l'etat non securise de la premiere etape du TP.
 */
@Injectable()
export class GardeJwt extends AuthGuard('jwt') {
  private readonly securiteActivee: boolean;

  constructor(
    private readonly reflecteur: Reflector,
    configuration: ConfigService<ConfigurationMyBrew, true>,
  ) {
    super();
    this.securiteActivee = configuration.get('securite', { infer: true }).activee;
  }

  override canActivate(contexte: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.securiteActivee) {
      return true;
    }

    const estPublique = this.reflecteur.getAllAndOverride<boolean>(CLE_PUBLIC, [
      contexte.getHandler(),
      contexte.getClass(),
    ]);

    if (estPublique) {
      return true;
    }

    return super.canActivate(contexte);
  }

  override handleRequest<TUtilisateur>(erreur: unknown, utilisateur: TUtilisateur, info: unknown): TUtilisateur {
    if (erreur || !utilisateur) {
      const detail = info instanceof Error ? info.message : 'jeton absent ou invalide';
      throw new UnauthorizedException(`Acces refuse : ${detail}.`);
    }

    return utilisateur;
  }
}
