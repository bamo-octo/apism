import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionService } from './session.service';

/**
 * Garde de route basee sur les roles du jeton.
 *
 * Elle n'apporte AUCUNE securite : elle evite juste d'afficher des ecrans qui
 * renverraient un 403. La vraie decision est prise par la gateway et par l'API.
 */
export const garderRole = (role: string): CanActivateFn => () => {
  const session = inject(SessionService);
  const routeur = inject(Router);

  if (session.aLeRole(role)) {
    return true;
  }

  return routeur.createUrlTree(['/acces-refuse'], { queryParams: { role } });
};

/** Exige une session ouverte (sans declencher de redirection Keycloak). */
export const garderAuthentification: CanActivateFn = () => {
  const session = inject(SessionService);
  const routeur = inject(Router);

  if (!session.authentificationActivee || session.estAuthentifie()) {
    return true;
  }

  return routeur.createUrlTree(['/']);
};
