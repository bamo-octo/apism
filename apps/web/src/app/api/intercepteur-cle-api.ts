import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';

/** Ajoute la clé d'API aux appels vers l'API lorsqu'elle est configurée. */
export const intercepteurCleApi: HttpInterceptorFn = (requete, suivant) => {
  const { cleApi, urlApi } = inject(CONFIGURATION_APPLICATION);

  if (!cleApi || !requete.url.startsWith(urlApi)) {
    return suivant(requete);
  }

  return suivant(requete.clone({ setHeaders: { 'x-api-key': cleApi } }));
};
