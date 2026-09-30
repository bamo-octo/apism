import type { HttpInterceptorFn } from '@angular/common/http';
import type { EnvironmentProviders } from '@angular/core';
import { authInterceptor, provideAuth } from 'angular-auth-oidc-client';
import type { ConfigurationApplication } from '../configuration/configuration-application';

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
        scope: 'openid',
        responseType: 'code',
        redirectUrl: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        secureRoutes: [configuration.urlApi],
        silentRenew: renouvellement,
        useRefreshToken: renouvellement,
        renewTimeBeforeTokenExpiresInSeconds: 30,
        ignoreNonceAfterRefresh: true,
      },
    }),
  ];
};

/** Ajoute le jeton d'accès aux appels vers l'API lorsque l'utilisateur est connecté. */
export const intercepteursAuthentification = (
  configuration: ConfigurationApplication,
): HttpInterceptorFn[] => (authentificationActivee(configuration) ? [authInterceptor()] : []);
