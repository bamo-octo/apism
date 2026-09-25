import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { UTILISATEUR_ANONYME, type Utilisateur } from './utilisateur.js';

/** Utilisateur à l'origine de la requête, ou « Anonyme » si on ne sait pas qui c'est. */
export const UtilisateurCourant = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): Utilisateur =>
    contexte.switchToHttp().getRequest<{ user?: Utilisateur }>().user ?? UTILISATEUR_ANONYME,
);
