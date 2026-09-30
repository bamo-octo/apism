import { createInterface } from 'node:readline/promises';
import { setTimeout as attendre } from 'node:timers/promises';

const { ASCENSEUR_URL_API, ASCENSEUR_CLE_API, ASCENSEUR_KEYCLOAK_AUTORITE, ASCENSEUR_CLIENT_ID } = process.env;

function abandonner(message) {
  console.log(message);
  process.exit();
}

async function envoyerFormulaire(url, parametres) {
  const reponse = await fetch(url, { method: 'POST', body: new URLSearchParams(parametres) }).catch(() =>
    abandonner("Service d'identification indisponible, réessayez dans quelques instants."),
  );
  return reponse.json();
}

async function seConnecter() {
  const urlOpenIdConnect = `${ASCENSEUR_KEYCLOAK_AUTORITE}/protocol/openid-connect`;
  const demande = await envoyerFormulaire(`${urlOpenIdConnect}/auth/device`, { client_id: ASCENSEUR_CLIENT_ID });

  if (demande.error) {
    abandonner(demande.error_description ?? demande.error);
  }

  console.log(`\nPour vous identifier, ouvrez ${demande.verification_uri} et saisissez le code ${demande.user_code}`);
  console.log(`ou ouvrez directement ${demande.verification_uri_complete}\n`);

  let intervalle = demande.interval;
  while (true) {
    await attendre(intervalle * 1000);
    const reponse = await envoyerFormulaire(`${urlOpenIdConnect}/token`, {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: ASCENSEUR_CLIENT_ID,
      device_code: demande.device_code,
    });

    if (reponse.access_token) {
      return reponse.access_token;
    }
    if (reponse.error === 'slow_down') {
      intervalle += 5;
    } else if (reponse.error !== 'authorization_pending') {
      abandonner(reponse.error_description ?? reponse.error);
    }
  }
}

const reponseBoissons = await fetch(`${ASCENSEUR_URL_API}/boissons`).catch(() =>
  abandonner('Machine à café indisponible, réessayez dans quelques instants.'),
);
const boissons = await reponseBoissons.json();
boissons.forEach((boisson, index) => console.log(`${index + 1}. ${boisson.libelle}`));

const terminal = createInterface({ input: process.stdin, output: process.stdout });
const boisson = boissons[Number(await terminal.question('\nVotre boisson : ')) - 1];
terminal.close();

if (!boisson) {
  abandonner('Boisson inconnue.');
}

const jeton = ASCENSEUR_CLIENT_ID ? await seConnecter() : undefined;

const reponse = await fetch(`${ASCENSEUR_URL_API}/preparations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ASCENSEUR_CLE_API,
    ...(jeton && { Authorization: `Bearer ${jeton}` }),
  },
  body: JSON.stringify({ idBoisson: boisson.id }),
});

const messages = { 401: 'Accès non autorisé.', 403: 'Accès impossible.' };
console.log(reponse.ok ? `Votre ${boisson.libelle} vous attend à la machine.` : (messages[reponse.status] ?? 'La commande a échoué.'));
