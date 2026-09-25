import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { creerConfigurationApplication } from './app/app.config';
import {
  CONFIGURATION_PAR_DEFAUT,
  type ConfigurationApplication,
} from './app/configuration/configuration-application';

const chargerConfiguration = async (): Promise<ConfigurationApplication> => {
  try {
    const reponse = await fetch('configuration.json', { cache: 'no-store' });

    if (!reponse.ok) {
      throw new Error(`HTTP ${reponse.status}`);
    }

    return (await reponse.json()) as ConfigurationApplication;
  } catch (erreur) {
    console.warn('configuration.json introuvable, utilisation des valeurs par defaut.', erreur);

    return CONFIGURATION_PAR_DEFAUT;
  }
};

const configuration = await chargerConfiguration();

await bootstrapApplication(App, creerConfigurationApplication(configuration)).catch(
  (erreur: unknown) => console.error(erreur),
);
