/**
 * Configuration de l'API MyBrew, alimentee par des variables d'environnement.
 *
 * Point important pour la formation : l'URL du JWKS (`urlJwks`) et l'emetteur
 * attendu dans le jeton (`emetteur`) sont deux reglages distincts.
 * Dans Docker, l'API joint Keycloak via le nom de service `keycloak` alors que
 * le jeton, lui, contient l'URL vue par le navigateur (`localhost`).
 */
export interface ConfigurationMyBrew {
  port: number;
  originesAutorisees: string[];
  securite: {
    /** Emetteur attendu dans la revendication `iss` du jeton. */
    emetteur: string;
    /** URL des cles publiques de Keycloak, joignable depuis l'API. */
    urlJwks: string;
    /** Audience attendue dans la revendication `aud` du jeton. */
    audience: string;
    /** Permet de demarrer l'API sans securite (etape 1 du TP). */
    activee: boolean;
  };
}

const enListe = (valeur: string | undefined, defaut: string): string[] =>
  (valeur ?? defaut)
    .split(',')
    .map((element) => element.trim())
    .filter((element) => element.length > 0);

export const chargerConfiguration = (): ConfigurationMyBrew => {
  const urlPubliqueKeycloak = process.env.KEYCLOAK_URL_PUBLIQUE ?? 'http://localhost:8080';
  const urlInterneKeycloak = process.env.KEYCLOAK_URL_INTERNE ?? urlPubliqueKeycloak;
  const realm = process.env.KEYCLOAK_REALM ?? 'mybrew';

  return {
    port: Number(process.env.PORT ?? 3000),
    originesAutorisees: enListe(
      process.env.ORIGINES_AUTORISEES,
      'http://localhost:4200,http://localhost:8082',
    ),
    securite: {
      emetteur: process.env.JWT_EMETTEUR ?? `${urlPubliqueKeycloak}/realms/${realm}`,
      urlJwks:
        process.env.JWT_URL_JWKS ??
        `${urlInterneKeycloak}/realms/${realm}/protocol/openid-connect/certs`,
      audience: process.env.JWT_AUDIENCE ?? 'mybrew-api',
      activee: (process.env.SECURITE_ACTIVEE ?? 'true') !== 'false',
    },
  };
};
