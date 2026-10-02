const URL_PUBLIQUE = process.env.KEYCLOAK_URL_PUBLIQUE ?? 'http://localhost:18080';
const URL_INTERNE = process.env.KEYCLOAK_URL_INTERNE ?? URL_PUBLIQUE;

/** Émetteur attendu dans les jetons : l'URL du realm vue par les clients. */
export const EMETTEUR = `${URL_PUBLIQUE}/realms/mybrew`;

/** Clés publiques du realm, téléchargées par l'API pour vérifier la signature des jetons. */
export const URL_CLES_PUBLIQUES = `${URL_INTERNE}/realms/mybrew/protocol/openid-connect/certs`;

/** Audience attendue dans les jetons : le client Keycloak qui représente l'API MyBrew. */
export const AUDIENCE = 'mybrew-api';

/** Endpoint de Keycloak qui délivre les jetons, appelé par l'API pour échanger un jeton. */
export const URL_JETONS = `${URL_INTERNE}/realms/mybrew/protocol/openid-connect/token`;
