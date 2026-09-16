import {
  CanActivate,
  ForbiddenException,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLE_ROLES, CLE_SCOPES } from './decorateurs.js';
import type { Utilisateur } from './utilisateur.js';

/**
 * Garde globale d'autorisation. Elle distingue deux notions souvent
 * confondues :
 *
 * - le **role** dit ce que l'utilisateur a le droit de faire (`technicien`) ;
 * - le **scope** dit ce que l'application cliente a le droit de demander
 *   en son nom (`machine:entretenir`).
 *
 * Les deux doivent etre satisfaits : un administrateur qui se connecte via une
 * application ne disposant pas du scope n'obtient rien.
 */
@Injectable()
export class GardeAutorisation implements CanActivate {
  constructor(private readonly reflecteur: Reflector) {}

  canActivate(contexte: ExecutionContext): boolean {
    const cibles = [contexte.getHandler(), contexte.getClass()];
    const rolesRequis = this.reflecteur.getAllAndOverride<string[]>(CLE_ROLES, cibles) ?? [];
    const scopesRequis = this.reflecteur.getAllAndOverride<string[]>(CLE_SCOPES, cibles) ?? [];

    if (rolesRequis.length === 0 && scopesRequis.length === 0) {
      return true;
    }

    const utilisateur = contexte.switchToHttp().getRequest<{ user?: Utilisateur }>().user;

    // Securite desactivee (etape 1 du TP) : aucun jeton, donc rien a verifier.
    if (!utilisateur) {
      return true;
    }

    const scopesManquants = scopesRequis.filter((scope) => !utilisateur.scopes.includes(scope));
    if (scopesManquants.length > 0) {
      throw new ForbiddenException(
        `Scope(s) manquant(s) dans le jeton : ${scopesManquants.join(', ')}.`,
      );
    }

    if (rolesRequis.length > 0 && !rolesRequis.some((role) => utilisateur.roles.includes(role))) {
      throw new ForbiddenException(
        `Role requis : ${rolesRequis.join(' ou ')}. Roles du jeton : ${
          utilisateur.roles.join(', ') || 'aucun'
        }.`,
      );
    }

    return true;
  }
}
