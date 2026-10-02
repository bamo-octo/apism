// Importe dans Gravitee l'API MyBrew (api-mybrew.json) et l'application de la SPA, si elles n'existent pas encore.
import { readFile } from 'node:fs/promises';
import { setTimeout as attendre } from 'node:timers/promises';

const { URL_MANAGEMENT_API, ORIGINE_SPA } = process.env;
const environnement = `${URL_MANAGEMENT_API}/management/v2/environments/DEFAULT`;
const environnementV1 = `${URL_MANAGEMENT_API}/management/v1/organizations/DEFAULT/environments/DEFAULT`;
let jeton;

async function appeler(methode, url, corps) {
  const reponse = await fetch(url, {
    method: methode,
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: corps && JSON.stringify(corps),
  });
  if (!reponse.ok) {
    throw new Error(`${methode} ${url} : ${reponse.status} ${await reponse.text()}`);
  }
  return reponse.status === 204 ? undefined : reponse.json();
}

async function seConnecter() {
  while (true) {
    const reponse = await fetch(`${URL_MANAGEMENT_API}/management/v1/organizations/DEFAULT/user/login`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa('admin:admin')}` },
    }).catch(() => undefined);
    if (reponse?.ok) {
      jeton = (await reponse.json()).token;
      return;
    }
    console.log("En attente de l'API de management de Gravitee...");
    await attendre(5000);
  }
}

await seConnecter();

const { data: apis } = await appeler('GET', `${environnement}/apis?perPage=100`);
if (apis.some((api) => api.name === 'MyBrew')) {
  console.log("L'API MyBrew existe déjà dans Gravitee.");
  process.exit();
}

const definition = (await readFile('api-mybrew.json', 'utf8')).replaceAll('${ORIGINE_SPA}', ORIGINE_SPA);
const api = await appeler('POST', `${environnement}/apis/_import/definition`, JSON.parse(definition));
const { data: plans } = await appeler('GET', `${environnement}/apis/${api.id}/plans`);

const application = await appeler('POST', `${environnementV1}/applications`, {
  name: 'MyBrew web',
  description: 'SPA MyBrew',
  settings: { app: { client_id: 'mybrew-web' } },
});
await appeler('POST', `${environnementV1}/applications/${application.id}/subscriptions?plan=${plans[0].id}`, {});

await appeler('POST', `${environnement}/apis/${api.id}/_start`);
console.log("L'API MyBrew est importée et démarrée dans Gravitee.");
