import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Utilisateur } from './utilisateur.js';

/** Utilisateur à l'origine de la requête, ou `undefined` si on ne sait pas qui c'est. */
export const UtilisateurCourant = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): Utilisateur | undefined =>
    contexte.switchToHttp().getRequest<{ user?: Utilisateur }>().user,
);
