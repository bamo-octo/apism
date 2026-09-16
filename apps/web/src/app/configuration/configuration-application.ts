import { InjectionToken } from '@angular/core';

/**
 * Configuration chargee a l'execution depuis `configuration.json`.
 *
 * Elle n'est pas compilee dans le bundle : on peut donc faire pointer la SPA
 * sur l'API en direct (etapes 1 a 5 du TP) puis sur la gateway Gravitee
 * (etapes 6 et suivantes) sans recompiler.
 */
export interface ConfigurationApplication {
  /** Racine des appels metier, avec ou sans gateway. */
  urlApi: string;

  /** Libelle affiche dans le bandeau, pour se reperer pendant le TP. */
  etape: string;

  /** Vrai lorsque la SPA doit demander un jeton avant d'appeler l'API. */
  authentificationActivee: boolean;

  keycloak: {
    /** Issuer OIDC, par exemple http://localhost:8080/realms/mybrew */
    autorite: string;
    clientId: string;
    /** Scopes demandes lors de l'autorisation. */
    scopes: string;
  };

  /** Cle d'API Gravitee, utilisee par le plan « API Key » de l'etape 9. */
  cleApiGravitee?: string;
}

export const CONFIGURATION_APPLICATION = new InjectionToken<ConfigurationApplication>(
  'CONFIGURATION_APPLICATION',
);

/** Valeurs de repli, utilisees si `configuration.json` est absent. */
export const CONFIGURATION_PAR_DEFAUT: ConfigurationApplication = {
  urlApi: 'http://localhost:8082/mybrew',
  etape: 'Architecture finale',
  authentificationActivee: true,
  keycloak: {
    autorite: 'http://localhost:8080/realms/mybrew',
    clientId: 'mybrew-spa',
    scopes: 'openid profile email boisson:preparer machine:entretenir statistiques:lire',
  },
};
