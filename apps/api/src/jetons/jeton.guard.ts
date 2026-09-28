import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un jeton d'accès Keycloak valide, vérifié par `JwtStrategy`. */
@Injectable()
export class JetonGuard extends AuthGuard('jwt') {
  override handleRequest<TUtilisateur>(erreur: unknown, utilisateur: TUtilisateur): TUtilisateur {
    if (erreur || !utilisateur) {
      throw new UnauthorizedException("Jeton d'accès manquant, invalide ou expiré.");
    }

    return utilisateur;
  }
}
