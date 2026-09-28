import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { intercepteurCleApi } from './api/intercepteur-cle-api';
import { routes } from './app.routes';
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
    provideHttpClient(withInterceptors([intercepteurCleApi])),
    { provide: CONFIGURATION_APPLICATION, useValue: configuration },
  ],
});
