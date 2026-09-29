import { InjectionToken } from '@angular/core';

export interface ConfigurationApplication {
  urlApi: string;
  cleApi?: string;
  keycloak: {
    autorite: string;
    clientId?: string;
  };
}

export const CONFIGURATION_APPLICATION = new InjectionToken<ConfigurationApplication>(
  'CONFIGURATION_APPLICATION',
);

export const CONFIGURATION_PAR_DEFAUT: ConfigurationApplication = {
  urlApi: 'http://localhost:3000',
  keycloak: { autorite: 'http://localhost:18080/realms/mybrew' },
};
