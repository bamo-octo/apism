import type { HttpInterceptorFn } from '@angular/common/http';
import { type EnvironmentProviders, inject } from '@angular/core';
import { OidcSecurityService, provideAuth } from 'angular-auth-oidc-client';
import { switchMap } from 'rxjs';
import {
  CONFIGURATION_APPLICATION,
  type ConfigurationApplication,
} from '../configuration/configuration-application';

export const authentificationActivee = (configuration: ConfigurationApplication): boolean =>
  Boolean(configuration.keycloak.clientId);

/**
 * Connexion à Keycloak avec le flow authorization code + PKCE, si un client est configuré.
 * Avec `renouvellementAutomatique`, le jeton d'accès est renouvelé avant expiration grâce au refresh token.
 */
export const fournirAuthentification = (
  configuration: ConfigurationApplication,
): EnvironmentProviders[] => {
  if (!authentificationActivee(configuration)) {
    return [];
  }

  const renouvellement = configuration.keycloak.renouvellementAutomatique ?? false;

  return [
    provideAuth({
      config: {
        authority: configuration.keycloak.autorite,
        clientId: configuration.keycloak.clientId,
        scope: configuration.keycloak.scope ?? 'openid',
        responseType: 'code',
        // L'identité de l'utilisateur est lue dans l'ID token.
        autoUserInfo: false,
        redirectUrl: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        silentRenew: renouvellement,
        useRefreshToken: renouvellement,
        renewTimeBeforeTokenExpiresInSeconds: 30,
        ignoreNonceAfterRefresh: true,
      },
    }),
  ];
};

/** Ajoute le jeton aux appels vers l'API : le jeton d'accès, ou l'ID token avec `jetonPourApi: "id"`. */
const intercepteurJeton: HttpInterceptorFn = (requete, suivant) => {
  const { keycloak, urlApi } = inject(CONFIGURATION_APPLICATION);
  const oidc = inject(OidcSecurityService);

  if (!requete.url.startsWith(urlApi)) {
    return suivant(requete);
  }

  const jeton$ = keycloak.jetonPourApi === 'id' ? oidc.getIdToken() : oidc.getAccessToken();

  return jeton$.pipe(
    switchMap((jeton) =>
      suivant(jeton ? requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }) : requete),
    ),
  );
};

export const intercepteursAuthentification = (
  configuration: ConfigurationApplication,
): HttpInterceptorFn[] => (authentificationActivee(configuration) ? [intercepteurJeton] : []);
