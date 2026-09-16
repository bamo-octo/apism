import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';

/**
 * Ajoute la cle d'API Gravitee lorsqu'elle est configuree.
 *
 * Le jeton d'acces, lui, est ajoute par `authInterceptor()` de la librairie
 * OIDC : il s'appuie sur la liste `secureRoutes` declaree dans app.config.ts.
 */
export const intercepteurGravitee: HttpInterceptorFn = (requete, suivant) => {
  const cleApi = inject(CONFIGURATION_APPLICATION).cleApiGravitee;

  if (!cleApi) {
    return suivant(requete);
  }

  return suivant(requete.clone({ setHeaders: { 'X-Gravitee-Api-Key': cleApi } }));
};
