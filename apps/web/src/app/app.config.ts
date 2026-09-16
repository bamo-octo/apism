import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { LogLevel, authInterceptor, provideAuth } from 'angular-auth-oidc-client';
import { routes } from './app.routes';
import {
  CONFIGURATION_APPLICATION,
  type ConfigurationApplication,
} from './configuration/configuration-application';
import { intercepteurGravitee } from './noyau/intercepteur-gravitee';

/**
 * Construit la configuration Angular a partir de la configuration d'execution.
 *
 * Le flow utilise est Authorization Code + PKCE (`responseType: 'code'` sur un
 * client public) : la SPA ne detient aucun secret, ce qui est le seul choix
 * acceptable pour une application qui tourne dans un navigateur.
 */
export const creerConfigurationApplication = (
  configuration: ConfigurationApplication,
): ApplicationConfig => ({
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor(), intercepteurGravitee])),
    { provide: CONFIGURATION_APPLICATION, useValue: configuration },
    provideAuth({
      config: {
        authority: configuration.keycloak.autorite,
        clientId: configuration.keycloak.clientId,
        scope: configuration.keycloak.scopes,
        redirectUrl: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        responseType: 'code',
        // PKCE avec S256 : active par defaut des que `responseType` vaut `code`.
        silentRenew: true,
        useRefreshToken: true,
        renewTimeBeforeTokenExpiresInSeconds: 30,
        ignoreNonceAfterRefresh: true,
        // `authInterceptor()` n'ajoute le jeton que sur ces prefixes d'URL.
        secureRoutes: [configuration.urlApi],
        logLevel: LogLevel.Warn,
      },
    }),
  ],
});
