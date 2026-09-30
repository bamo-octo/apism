import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { intercepteurCleApi } from './api/intercepteur-cle-api';
import { routes } from './app.routes';
import {
  fournirAuthentification,
  intercepteursAuthentification,
} from './authentification/authentification';
import { SessionService } from './authentification/session.service';
import {
  CONFIGURATION_APPLICATION,
  type ConfigurationApplication,
} from './configuration/configuration-application';

export const creerConfigurationApplication = (
  configuration: ConfigurationApplication,
): ApplicationConfig => ({
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([intercepteurCleApi, ...intercepteursAuthentification(configuration)]),
    ),
    { provide: CONFIGURATION_APPLICATION, useValue: configuration },
    ...fournirAuthentification(configuration),
    // La session est ouverte avant le premier appel à l'API, pour qu'il parte avec le jeton.
    provideAppInitializer(() => inject(SessionService).ouvrir()),
  ],
});
