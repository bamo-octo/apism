import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Utilisateur } from './utilisateur.js';

export const CLE_PUBLIC = 'mybrew:public';
export const CLE_ROLES = 'mybrew:roles';
export const CLE_SCOPES = 'mybrew:scopes';

/** Rend une route accessible sans jeton d'acces. */
export const Public = () => SetMetadata(CLE_PUBLIC, true);

/** Exige au moins un des roles listes (revendication `realm_access.roles`). */
export const RolesRequis = (...roles: string[]) => SetMetadata(CLE_ROLES, roles);

/** Exige tous les scopes listes (revendication `scope`). */
export const ScopesRequis = (...scopes: string[]) => SetMetadata(CLE_SCOPES, scopes);

/** Injecte l'utilisateur reconstruit depuis le jeton dans un parametre de methode. */
export const UtilisateurCourant = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): Utilisateur | undefined =>
    contexte.switchToHttp().getRequest<{ user?: Utilisateur }>().user,
);
