/**
 * Sonde embarquee de la machine MyBrew.
 *
 * C'est le cas d'usage type du flow OAuth 2.0 « client_credentials » :
 * aucun utilisateur n'est present derriere l'appel, c'est la machine elle-meme
 * qui s'authentifie avec son identifiant et son secret, puis publie ses
 * releves sur l'API a travers la gateway.
 *
 * Volontairement sans dependance : tout est fait avec `fetch` et la
 * bibliotheque standard de Node, pour que le code reste lisible pendant le TP.
 */

const configuration = {
  urlJeton:
    process.env.URL_JETON ??
    'http://keycloak:8080/realms/mybrew/protocol/openid-connect/token',
  clientId: process.env.CLIENT_ID ?? 'mybrew-sonde',
  clientSecret: process.env.CLIENT_SECRET ?? 'sonde-secret-de-formation',
  scopes: process.env.SCOPES ?? 'machine:telemetrie',
  urlApi: (process.env.URL_API ?? 'http://gateway:8082/mybrew').replace(/\/$/, ''),
  cleApiGravitee: process.env.CLE_API_GRAVITEE ?? '',
  intervalleSecondes: Number(process.env.INTERVALLE_SECONDES ?? 20),
};

const journaliser = (niveau, message) => {
  const horodatage = new Date().toISOString().slice(11, 19);
  console.log(`[${horodatage}] ${niveau.padEnd(6)} ${message}`);
};

const attendre = (millisecondes) =>
  new Promise((resoudre) => setTimeout(resoudre, millisecondes));

/** Jeton d'acces courant, conserve jusqu'a 30 s avant son expiration. */
let jetonEnCache = null;

/**
 * Demande un jeton d'acces au serveur d'autorisation.
 * Note : le secret ne quitte jamais le conteneur de la sonde, contrairement a
 * une SPA ou aucun secret ne peut etre garde (d'ou PKCE cote navigateur).
 */
const obtenirJeton = async () => {
  if (jetonEnCache && jetonEnCache.expireA - 30_000 > Date.now()) {
    return jetonEnCache.valeur;
  }

  const corps = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: configuration.clientId,
    client_secret: configuration.clientSecret,
    scope: configuration.scopes,
  });

  const reponse = await fetch(configuration.urlJeton, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corps,
  });

  if (!reponse.ok) {
    throw new Error(
      `Obtention du jeton refusee (HTTP ${reponse.status}) : ${await reponse.text()}`,
    );
  }

  const charge = await reponse.json();

  jetonEnCache = {
    valeur: charge.access_token,
    expireA: Date.now() + charge.expires_in * 1000,
  };

  const scopesObtenus = charge.scope ?? '(aucun)';
  journaliser('OAUTH', `Jeton obtenu pour ${configuration.intervalleSecondes}s+ | scopes : ${scopesObtenus}`);

  return jetonEnCache.valeur;
};

const construireEnTetes = async () => {
  const entetes = {
    Authorization: `Bearer ${await obtenirJeton()}`,
    'Content-Type': 'application/json',
  };

  if (configuration.cleApiGravitee) {
    entetes['X-Gravitee-Api-Key'] = configuration.cleApiGravitee;
  }

  return entetes;
};

/**
 * Ce que « mesurent » les capteurs. La sonde est la source de verite du monde
 * physique : elle n'interroge pas l'API pour savoir ce qu'il reste dans les
 * reservoirs, elle le lui annonce. C'est pour cela qu'elle n'a besoin que d'une
 * seule route, et donc que d'un seul scope : `machine:telemetrie`.
 */
const mesures = {
  eauMl: 2000,
  grainsG: 500,
  laitMl: 1000,
  marcG: 0,
};

/**
 * Fait deriver les mesures comme le ferait une machine en service :
 * les reservoirs baissent, le bac a marc se remplit, la temperature oscille.
 */
const construireReleve = () => {
  mesures.eauMl = Math.max(0, mesures.eauMl - 20 - Math.round(Math.random() * 20));
  mesures.grainsG = Math.max(0, mesures.grainsG - 3 - Math.round(Math.random() * 3));
  mesures.laitMl = Math.max(0, mesures.laitMl - 8 - Math.round(Math.random() * 8));
  mesures.marcG = Math.min(200, mesures.marcG + 4 + Math.round(Math.random() * 3));

  return {
    ...mesures,
    temperatureC: Math.round((90 + Math.random() * 4) * 10) / 10,
    enService: true,
  };
};

const publierReleve = async (releve) => {
  const reponse = await fetch(`${configuration.urlApi}/machine/telemetrie`, {
    method: 'POST',
    headers: await construireEnTetes(),
    body: JSON.stringify(releve),
  });

  if (!reponse.ok) {
    throw new Error(`Releve refuse (HTTP ${reponse.status}) : ${await reponse.text()}`);
  }

  return reponse.json();
};

const unCycle = async () => {
  const etatMisAJour = await publierReleve(construireReleve());

  journaliser(
    'RELEVE',
    `eau ${etatMisAJour.eau.pourcentage}% | grains ${etatMisAJour.grains.pourcentage}% | ` +
      `lait ${etatMisAJour.lait.pourcentage}% | marc ${etatMisAJour.bacAMarc.pourcentage}% | ` +
      `${etatMisAJour.temperatureC} degres` +
      (etatMisAJour.alertes.length > 0 ? ` | ALERTES : ${etatMisAJour.alertes.join(', ')}` : ''),
  );
};

const demarrer = async () => {
  journaliser('DEBUT', `Sonde ${configuration.clientId} -> ${configuration.urlApi}`);
  journaliser('DEBUT', `Serveur d'autorisation : ${configuration.urlJeton}`);

  if (process.argv.includes('--jeton-seulement')) {
    console.log(await obtenirJeton());
    return;
  }

  // Boucle infinie : les erreurs sont journalisees puis la sonde reessaie.
  for (;;) {
    try {
      await unCycle();
    } catch (erreur) {
      journaliser('ERREUR', erreur.message);
      // Un 401 peut venir d'un jeton revoque : on force un renouvellement.
      jetonEnCache = null;
    }

    await attendre(configuration.intervalleSecondes * 1000);
  }
};

await demarrer();
