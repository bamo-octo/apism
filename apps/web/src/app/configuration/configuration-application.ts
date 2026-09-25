import { InjectionToken } from '@angular/core';

export interface ConfigurationApplication {
  urlApi: string;
}

export const CONFIGURATION_APPLICATION = new InjectionToken<ConfigurationApplication>(
  'CONFIGURATION_APPLICATION',
);

export const CONFIGURATION_PAR_DEFAUT: ConfigurationApplication = {
  urlApi: 'http://localhost:3000',
};
