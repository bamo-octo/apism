import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';

/** Ajoute la clé d'API aux appels lorsqu'elle est configurée. */
export const intercepteurCleApi: HttpInterceptorFn = (requete, suivant) => {
  const cleApi = inject(CONFIGURATION_APPLICATION).cleApi;

  if (!cleApi) {
    return suivant(requete);
  }

  return suivant(requete.clone({ setHeaders: { 'x-api-key': cleApi } }));
};
