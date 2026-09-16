// Amorcage de Gravitee APIM pour le TP MyBrew.
//
// Ce script rejoue, via l'API de management, ce que l'on ferait a la main dans
// la console Gravitee (http://localhost:8084) :
//
//   1. il declare l'API « MyBrew » (proxy HTTP v4) vers http://api:3000 ;
//   2. il ajoute la ressource d'introspection OAuth2 pointant sur Keycloak ;
//   3. il cree trois plans (JWT, OAuth2, API Key) avec leurs politiques ;
//   4. il cree trois applications et les abonne au plan qui leur correspond ;
//   5. il publie les plans, demarre l'API et resume le tout dans la console.
//
// Le script est idempotent : si l'API existe deja il ne fait rien, sauf si la
// variable REAMORCER=true est positionnee (il supprime alors tout et recommence).
//
// Aucune dependance : uniquement le `fetch` natif de Node 24.

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const urlManagement = (process.env.URL_MANAGEMENT_API ?? 'http://localhost:8083').replace(/\/$/, '');
const administrateur = process.env.GRAVITEE_ADMIN ?? 'admin';
const motDePasse = process.env.GRAVITEE_MOT_DE_PASSE_ADMIN ?? 'admin';

const organisation = process.env.ORGANISATION ?? 'DEFAULT';
const environnement = process.env.ENVIRONNEMENT ?? 'DEFAULT';

const urlApiCible = process.env.URL_API_CIBLE ?? 'http://api:3000';
const cheminContexte = process.env.CHEMIN_CONTEXTE ?? '/mybrew';

// Keycloak vu depuis le reseau Docker : la gateway telecharge les cles publiques
// et appelle l'introspection par ce nom d'hote, jamais par « localhost ».
const urlRealmInterne = (
  process.env.URL_REALM_INTERNE ?? 'http://keycloak:8080/realms/mybrew'
).replace(/\/$/, '');
const urlJwks = process.env.URL_JWKS ?? `${urlRealmInterne}/protocol/openid-connect/certs`;
const cheminIntrospection =
  process.env.CHEMIN_INTROSPECTION ?? '/protocol/openid-connect/token/introspect';
const clientIntrospection = process.env.CLIENT_INTROSPECTION ?? 'gravitee-introspection';
const secretIntrospection = process.env.SECRET_INTROSPECTION ?? 'gravitee-secret-de-formation';

const limiteDebitParMinute = Number(process.env.LIMITE_DEBIT_PAR_MINUTE ?? 3);
const quotaParJour = Number(process.env.QUOTA_PAR_JOUR ?? 20);
const quotaDecouverteParJour = Number(process.env.QUOTA_DECOUVERTE_PAR_JOUR ?? 100);

const origineSpa = process.env.ORIGINE_SPA ?? 'http://localhost:4200';
const cleApiSouhaitee = process.env.CLE_API_DECOUVERTE ?? 'mybrew-cle-de-formation';

const reamorcer = (process.env.REAMORCER ?? 'false') === 'true';
const dossierSortie = process.env.DOSSIER_SORTIE ?? './sortie';

const NOM_API = 'MyBrew';

// Identifiants des clients Keycloak : ils font le lien entre un jeton et
// l'application Gravitee qui a souscrit au plan (revendication `azp`).
const CLIENT_SPA = process.env.CLIENT_SPA ?? 'mybrew-spa';
const CLIENT_SONDE = process.env.CLIENT_SONDE ?? 'mybrew-sonde';

const NOM_RESSOURCE_INTROSPECTION = 'introspection-keycloak';

// La route de telemetrie. Deux plans savent traiter un en-tete « Authorization:
// Bearer », il faut donc les departager : sans regle de selection, le premier
// plan de la liste capte tous les jetons et l'autre ne sert jamais.
const ROUTE_TELEMETRIE = '/machine/telemetrie';
// Note : ecrire « {!#request... } » ne fonctionne pas, le moteur d'expressions
// ne reconnait pas le delimiteur et renvoie la chaine telle quelle. On compare
// donc explicitement a false.
const REGLE_TELEMETRIE = `{#request.path.endsWith('${ROUTE_TELEMETRIE}')}`;
const REGLE_HORS_TELEMETRIE = `{#request.path.endsWith('${ROUTE_TELEMETRIE}') == false}`;

const PLANS = {
  utilisateurs: 'Utilisateurs MyBrew',
  sonde: 'Sonde machine',
  decouverte: 'Decouverte',
};

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

const journal = (message, ...reste) => console.log(`[amorcage] ${message}`, ...reste);
const patienter = (millisecondes) => new Promise((resoudre) => setTimeout(resoudre, millisecondes));

let jetonManagement = null;

/** Appelle l'API de management et renvoie le corps JSON (ou null si vide). */
const appeler = async (methode, chemin, corps, { toleres = [] } = {}) => {
  const enTetes = { Accept: 'application/json' };
  if (jetonManagement) enTetes.Authorization = `Bearer ${jetonManagement}`;
  if (corps !== undefined) enTetes['Content-Type'] = 'application/json';

  const reponse = await fetch(`${urlManagement}${chemin}`, {
    method: methode,
    headers: enTetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });

  const texte = await reponse.text();

  if (!reponse.ok && !toleres.includes(reponse.status)) {
    throw new Error(
      `${methode} ${chemin} -> HTTP ${reponse.status}\n${texte.slice(0, 1500)}`,
    );
  }

  if (!texte) return null;
  try {
    return JSON.parse(texte);
  } catch {
    return texte;
  }
};

const cheminV2 = (suffixe) => `/management/v2/environments/${environnement}${suffixe}`;
const cheminV1 = (suffixe) =>
  `/management/v1/organizations/${organisation}/environments/${environnement}${suffixe}`;

/** Attend que l'API de management reponde : elle demarre plus lentement que Mongo. */
const attendreManagement = async () => {
  const debut = Date.now();
  const limite = 5 * 60 * 1000;

  while (Date.now() - debut < limite) {
    try {
      const reponse = await fetch(`${urlManagement}/management/v2/ui/bootstrap`);
      if (reponse.ok) {
        journal("l'API de management repond");
        return;
      }
    } catch {
      // Le conteneur n'ecoute pas encore : on reessaie.
    }
    await patienter(3000);
  }

  throw new Error("l'API de management de Gravitee n'a pas demarre a temps");
};

/**
 * Authentification. Attention : l'authentification Basic n'est pas acceptee sur
 * les routes metier, il faut d'abord echanger les identifiants contre un jeton.
 */
const seConnecter = async () => {
  const identifiants = Buffer.from(`${administrateur}:${motDePasse}`).toString('base64');
  const reponse = await fetch(
    `${urlManagement}/management/v1/organizations/${organisation}/user/login`,
    { method: 'POST', headers: { Authorization: `Basic ${identifiants}` } },
  );

  if (!reponse.ok) {
    throw new Error(`connexion a Gravitee impossible : HTTP ${reponse.status}`);
  }

  const { token } = await reponse.json();
  jetonManagement = token;
  journal(`connecte en tant que « ${administrateur} »`);
};

// -----------------------------------------------------------------------------
// Definition de l'API
// -----------------------------------------------------------------------------

/** Politique ajoutant un en-tete de tracabilite lu par la route GET /moi. */
const marquerLePlan = (nomDuPlan) => ({
  name: 'Marquer le plan utilise',
  description: "Ajoute des en-tetes que l'API peut lire pour prouver le passage par la gateway",
  enabled: true,
  policy: 'transform-headers',
  configuration: {
    scope: 'REQUEST',
    addHeaders: [
      { name: 'X-MyBrew-Passe-Par-La-Gateway', value: 'oui' },
      { name: 'X-MyBrew-Plan', value: nomDuPlan },
    ],
  },
});

const definitionApi = () => ({
  definitionVersion: 'V4',
  type: 'PROXY',
  name: NOM_API,
  apiVersion: '1.0.0',
  description:
    "API de gestion de la machine a cafe MyBrew. Exposee par Gravitee ; l'API NestJS n'est pas joignable directement.",
  tags: [],
  listeners: [
    {
      type: 'HTTP',
      paths: [{ path: cheminContexte }],
      entrypoints: [{ type: 'http-proxy', qos: 'AUTO' }],
      // Le prevol OPTIONS est traite par la gateway sans jouer la chaine de
      // securite (runPolicies: false) : le navigateur n'envoie pas de jeton.
      cors: {
        enabled: true,
        allowCredentials: false,
        allowOrigin: [origineSpa],
        allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Authorization', 'Content-Type', 'X-Gravitee-Api-Key'],
        // Sans exposeHeaders, le navigateur cache ces en-tetes a la SPA et
        // l'ecran « Mon jeton » ne pourrait pas afficher les compteurs.
        exposeHeaders: [
          'X-Rate-Limit-Limit',
          'X-Rate-Limit-Remaining',
          'X-Rate-Limit-Reset',
          'X-Quota-Limit',
          'X-Quota-Remaining',
          'X-Quota-Reset',
          'Retry-After',
          'X-Gravitee-Transaction-Id',
          'X-Gravitee-Request-Id',
        ],
        maxAge: 3600,
        runPolicies: false,
      },
    },
  ],
  endpointGroups: [
    {
      name: 'Groupe par defaut',
      type: 'http-proxy',
      loadBalancer: { type: 'ROUND_ROBIN' },
      sharedConfiguration: {},
      endpoints: [
        {
          name: 'API NestJS',
          type: 'http-proxy',
          weight: 1,
          inheritConfiguration: false,
          configuration: { target: urlApiCible },
        },
      ],
    },
  ],
  // Journalisation activee : les participants voient les appels et les codes
  // d'erreur dans la console Gravitee, onglet « Analytics » / « Logs ».
  analytics: {
    enabled: true,
    logging: {
      mode: { entrypoint: true, endpoint: true },
      phase: { request: true, response: true },
      content: { headers: true, payload: false, messagePayload: false, messageHeaders: false },
      condition: '',
    },
  },
  flowExecution: { mode: 'DEFAULT', matchRequired: false },
  flows: [],
});

/**
 * Ressource d'introspection : c'est elle que le plan OAuth2 interroge pour
 * savoir si un jeton est encore valide. Contrairement a la validation locale
 * par JWKS, chaque appel declenche une requete vers Keycloak - plus lent, mais
 * un jeton revoque est refuse immediatement.
 */
const ressourceIntrospection = () => ({
  name: NOM_RESSOURCE_INTROSPECTION,
  type: 'oauth2',
  enabled: true,
  configuration: {
    authorizationServerUrl: urlRealmInterne,
    introspectionEndpoint: cheminIntrospection,
    introspectionEndpointMethod: 'POST',
    authorizationServerMetadataEndpoint: '/.well-known/oauth-authorization-server',
    // Keycloak attend le jeton dans le corps du formulaire et
    // l'authentification du client dans un en-tete Basic.
    tokenIsSuppliedByQueryParam: false,
    tokenIsSuppliedByHttpHeader: false,
    tokenIsSuppliedByFormUrlEncoded: true,
    tokenFormUrlEncodedName: 'token',
    useClientAuthorizationHeader: true,
    clientAuthorizationHeaderName: 'Authorization',
    clientAuthorizationHeaderScheme: 'Basic',
    clientId: clientIntrospection,
    clientSecret: secretIntrospection,
    scopeSeparator: ' ',
    userClaim: 'preferred_username',
  },
});

const definitionsPlans = () => [
  // ---------------------------------------------------------------------------
  // Plan 1 : les utilisateurs de la SPA, jetons valides localement (JWKS).
  // ---------------------------------------------------------------------------
  {
    name: PLANS.utilisateurs,
    description:
      "Pour la SPA MyBrew. La gateway verifie la signature du jeton Keycloak, limite le debit et le quota par utilisateur.",
    mode: 'STANDARD',
    validation: 'AUTO',
    order: 1,
    characteristics: ['JWT', 'Keycloak', 'rate limiting'],
    commentRequired: false,
    // Tout sauf la telemetrie, qui est reservee au plan de la sonde.
    selectionRule: REGLE_HORS_TELEMETRIE,
    security: {
      type: 'JWT',
      configuration: {
        signature: 'RSA_RS256',
        // La gateway ne connait aucun secret : elle telecharge les cles
        // publiques du realm et les met en cache.
        publicKeyResolver: 'JWKS_URL',
        resolverParameter: urlJwks,
        extractClaims: true,
        propagateAuthHeader: true,
        // userClaim alimente #context.attributes['user'] : c'est la cle du
        // rate limiting « par utilisateur de l'appli ».
        userClaim: 'preferred_username',
        // clientIdClaim relie le jeton a l'application Gravitee abonnee.
        clientIdClaim: 'azp',
        checkRequiredScopes: false,
      },
    },
    flows: [
      {
        name: 'Tracabilite',
        enabled: true,
        selectors: [],
        request: [marquerLePlan(PLANS.utilisateurs)],
        response: [],
        subscribe: [],
        publish: [],
      },
      {
        name: 'Limiter la cafeine',
        enabled: true,
        selectors: [
          { type: 'HTTP', path: '/preparations', pathOperator: 'EQUALS', methods: ['POST'] },
        ],
        request: [
          {
            name: 'Limiter le debit par utilisateur',
            description: `${limiteDebitParMinute} boissons par minute et par utilisateur`,
            enabled: true,
            policy: 'rate-limit',
            configuration: {
              addHeaders: true,
              async: false,
              rate: {
                key: "{#context.attributes['user']}",
                useKeyOnly: false,
                limit: limiteDebitParMinute,
                periodTime: 1,
                periodTimeUnit: 'MINUTES',
              },
            },
          },
          {
            name: 'Appliquer le quota journalier',
            description: `${quotaParJour} boissons par jour et par utilisateur`,
            enabled: true,
            policy: 'quota',
            configuration: {
              addHeaders: true,
              async: false,
              quota: {
                key: "{#context.attributes['user']}",
                useKeyOnly: false,
                limit: quotaParJour,
                periodTime: 1,
                periodTimeUnit: 'DAYS',
              },
            },
          },
        ],
        response: [],
        subscribe: [],
        publish: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Plan 2 : la sonde machine, jetons valides par introspection (Client Credentials).
  // ---------------------------------------------------------------------------
  {
    name: PLANS.sonde,
    description:
      "Pour la sonde de telemetrie (flow Client Credentials). Le jeton est verifie par introspection aupres de Keycloak, ce qui permet de le revoquer immediatement.",
    mode: 'STANDARD',
    validation: 'AUTO',
    order: 2,
    characteristics: ['OAuth2', 'introspection', 'machine a machine'],
    commentRequired: false,
    // Seule la route de telemetrie passe par l'introspection.
    selectionRule: REGLE_TELEMETRIE,
    security: {
      type: 'OAUTH2',
      configuration: {
        oauthResource: NOM_RESSOURCE_INTROSPECTION,
        extractPayload: true,
        // Le scope est verifie ici, la sonde n'a pas besoin d'aller plus loin.
        checkRequiredScopes: true,
        requiredScopes: ['machine:telemetrie'],
        modeStrict: true,
        propagateAuthHeader: true,
      },
    },
    flows: [
      {
        name: 'Telemetrie uniquement',
        enabled: true,
        selectors: [],
        request: [
          marquerLePlan(PLANS.sonde),
          {
            name: 'Restreindre a la publication de releves',
            description: 'Ceinture et bretelles : la sonde ne peut que POSTer sa telemetrie',
            enabled: true,
            policy: 'resource-filtering',
            configuration: {
              whitelist: [{ pattern: ROUTE_TELEMETRIE, methods: ['POST'] }],
            },
          },
        ],
        response: [],
        subscribe: [],
        publish: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Plan 3 : cle d'API, pour l'etape « plans / exposition / souscriptions ».
  // ---------------------------------------------------------------------------
  {
    name: PLANS.decouverte,
    description:
      "Plan distribue via le portail developpeur et protege par une cle d'API. Il n'ouvre que les routes publiques (catalogue, sante, documentation) : sans jeton utilisateur, l'API refuserait de toute facon le reste.",
    mode: 'STANDARD',
    validation: 'AUTO',
    order: 3,
    characteristics: ["cle d'API", 'lecture seule', 'portail'],
    commentRequired: false,
    security: { type: 'API_KEY', configuration: {} },
    flows: [
      {
        name: 'Lecture seule',
        enabled: true,
        selectors: [],
        request: [
          marquerLePlan(PLANS.decouverte),
          {
            name: 'Limiter aux routes publiques',
            description:
              "Une cle d'API n'identifie pas un utilisateur : seules les routes @Public() de l'API sont utiles ici",
            enabled: true,
            policy: 'resource-filtering',
            configuration: {
              whitelist: [
                { pattern: '/boissons', methods: ['GET'] },
                { pattern: '/sante', methods: ['GET'] },
                { pattern: '/documentation', methods: ['GET'] },
                { pattern: '/documentation/**', methods: ['GET'] },
                { pattern: '/documentation-json', methods: ['GET'] },
              ],
            },
          },
          {
            name: 'Appliquer un quota journalier',
            enabled: true,
            policy: 'quota',
            configuration: {
              addHeaders: true,
              async: false,
              quota: {
                key: '',
                useKeyOnly: false,
                limit: quotaDecouverteParJour,
                periodTime: 1,
                periodTimeUnit: 'DAYS',
              },
            },
          },
        ],
        response: [],
        subscribe: [],
        publish: [],
      },
    ],
  },
];

const definitionsApplications = () => [
  {
    name: 'SPA MyBrew',
    description: "L'application web utilisee par les employes (Authorization Code + PKCE).",
    settings: { app: { type: 'WEB', client_id: CLIENT_SPA } },
    plan: PLANS.utilisateurs,
  },
  {
    name: 'Sonde machine a cafe',
    description: 'Le boitier installe dans la machine, qui publie sa telemetrie sans utilisateur.',
    settings: { app: { type: 'BACKEND_TO_BACKEND', client_id: CLIENT_SONDE } },
    plan: PLANS.sonde,
  },
  {
    name: 'Tableau de bord cafeteria',
    description: "Ecran d'affichage de la cafeteria : lecture seule via une cle d'API.",
    settings: { app: { type: 'SIMPLE' } },
    plan: PLANS.decouverte,
    cleApi: cleApiSouhaitee,
  },
];

// -----------------------------------------------------------------------------
// Deroulement
// -----------------------------------------------------------------------------

/**
 * Autorise les cles d'API choisies par l'administrateur. Sans ce reglage,
 * Gravitee genere un UUID aleatoire et la cle differe pour chaque participant.
 */
const autoriserLesClesChoisies = async () => {
  const reglages = await appeler('GET', cheminV1('/settings'));
  if (reglages?.plan?.security?.customApiKey?.enabled) return;

  journal("activation des cles d'API personnalisees");
  reglages.plan ??= {};
  reglages.plan.security ??= {};
  reglages.plan.security.customApiKey = { enabled: true };
  await appeler('POST', cheminV1('/settings'), reglages, { toleres: [400] });
};

const listerApis = async () => {
  const reponse = await appeler('GET', cheminV2('/apis?perPage=200'));
  return reponse?.data ?? [];
};

const supprimerApi = async (api) => {
  journal(`suppression de l'API existante « ${api.name} » (${api.id})`);
  await appeler('POST', cheminV2(`/apis/${api.id}/_stop`), undefined, { toleres: [400, 409] });

  // Gravitee refuse de supprimer une API dont des plans sont encore ouverts :
  // fermer un plan ferme aussi les souscriptions qui en dependent.
  const plans = await appeler(
    'GET',
    cheminV2(`/apis/${api.id}/plans?perPage=100&statuses=PUBLISHED&statuses=STAGING&statuses=DEPRECATED`),
    undefined,
    { toleres: [404] },
  );

  for (const plan of plans?.data ?? []) {
    journal(`  fermeture du plan « ${plan.name} »`);
    await appeler('POST', cheminV2(`/apis/${api.id}/plans/${plan.id}/_close`), undefined, {
      toleres: [400],
    });
  }

  await appeler('DELETE', cheminV2(`/apis/${api.id}`), undefined, { toleres: [404] });
};

const listerApplications = async () => {
  const reponse = await appeler('GET', cheminV1('/applications'));
  return Array.isArray(reponse) ? reponse : (reponse?.data ?? []);
};

const supprimerApplication = async (application) => {
  journal(`suppression de l'application existante « ${application.name} »`);
  await appeler('DELETE', cheminV1(`/applications/${application.id}`), undefined, {
    toleres: [404],
  });
};

const creerApi = async () => {
  journal(`creation de l'API « ${NOM_API} » sur ${cheminContexte} -> ${urlApiCible}`);
  const api = await appeler('POST', cheminV2('/apis'), definitionApi());
  journal(`API creee : ${api.id}`);

  // La creation ignore le champ `resources` : il faut une mise a jour pour que
  // la ressource d'introspection existe, sinon le plan OAuth2 est silencieusement
  // ecarte par la gateway au moment du deploiement.
  journal(`ajout de la ressource d'introspection « ${NOM_RESSOURCE_INTROSPECTION} »`);
  const misAJour = await appeler('PUT', cheminV2(`/apis/${api.id}`), {
    ...api,
    resources: [ressourceIntrospection()],
  });

  return misAJour ?? api;
};

const creerPlans = async (idApi) => {
  const crees = {};

  for (const plan of definitionsPlans()) {
    journal(`creation du plan « ${plan.name} » (${plan.security.type})`);
    // definitionVersion sert de discriminant : sans lui l'API de management
    // n'arrive pas a deserialiser le corps et renvoie « must not be null ».
    const cree = await appeler('POST', cheminV2(`/apis/${idApi}/plans`), {
      definitionVersion: 'V4',
      ...plan,
    });
    await appeler('POST', cheminV2(`/apis/${idApi}/plans/${cree.id}/_publish`), undefined, {
      toleres: [400],
    });
    crees[plan.name] = cree;
  }

  return crees;
};

const creerApplications = async (idApi, plansCrees) => {
  const resume = [];

  for (const definition of definitionsApplications()) {
    journal(`creation de l'application « ${definition.name} »`);
    const application = await appeler('POST', cheminV1('/applications'), {
      name: definition.name,
      description: definition.description,
      settings: definition.settings,
      api_key_mode: definition.cleApi ? 'EXCLUSIVE' : undefined,
    });

    const plan = plansCrees[definition.plan];
    if (!plan) throw new Error(`plan introuvable : ${definition.plan}`);

    journal(`  abonnement au plan « ${definition.plan} »`);
    const parametres = new URLSearchParams({ application: application.id, plan: plan.id });

    // Une cle d'API fixe rend le TP reproductible ; si l'instance refuse les
    // cles personnalisees, on laisse Gravitee en generer une.
    let souscription = null;
    if (definition.cleApi) {
      souscription = await appeler(
        'POST',
        cheminV1(`/apis/${idApi}/subscriptions?${parametres}&customApiKey=${definition.cleApi}`),
        {},
        { toleres: [400] },
      );
      if (!souscription?.id) {
        journal('  cle personnalisee refusee, Gravitee en generera une');
        souscription = null;
      }
    }

    souscription ??= await appeler(
      'POST',
      cheminV1(`/apis/${idApi}/subscriptions?${parametres}`),
      {},
    );

    const entree = {
      application: definition.name,
      identifiantApplication: application.id,
      plan: definition.plan,
      souscription: souscription.id,
      clientId: definition.settings.app?.client_id ?? null,
    };

    if (definition.cleApi) {
      const cles = await appeler(
        'GET',
        cheminV1(`/apis/${idApi}/subscriptions/${souscription.id}/apikeys`),
        undefined,
        { toleres: [404] },
      );
      const cle = Array.isArray(cles) ? cles[0]?.key : null;
      if (cle) {
        entree.cleApi = cle;
        journal(`  cle d'API : ${cle}`);
      }
    }

    resume.push(entree);
  }

  return resume;
};

const demarrerApi = async (idApi) => {
  journal("demarrage et deploiement de l'API");
  await appeler('POST', cheminV2(`/apis/${idApi}/_start`), undefined, { toleres: [400] });
  await appeler(
    'POST',
    cheminV2(`/apis/${idApi}/deployments`),
    { deploymentLabel: 'amorcage du TP MyBrew' },
    { toleres: [400] },
  );
};

const ecrireRecapitulatif = async (recapitulatif) => {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');

  try {
    await mkdir(dossierSortie, { recursive: true });
    await writeFile(
      join(dossierSortie, 'recapitulatif.json'),
      `${JSON.stringify(recapitulatif, null, 2)}\n`,
      'utf8',
    );
    journal(`recapitulatif ecrit dans ${join(dossierSortie, 'recapitulatif.json')}`);
  } catch (erreur) {
    journal(`recapitulatif non ecrit (${erreur.message})`);
  }
};

const amorcer = async () => {
  await attendreManagement();
  await seConnecter();
  await autoriserLesClesChoisies();

  const apisExistantes = await listerApis();
  const dejaLa = apisExistantes.find((api) => api.name === NOM_API);

  if (dejaLa && !reamorcer) {
    journal(`l'API « ${NOM_API} » existe deja (${dejaLa.id}) : rien a faire.`);
    journal('pour tout recreer : docker compose run --rm -e REAMORCER=true amorcage');
    return;
  }

  if (dejaLa) {
    await supprimerApi(dejaLa);
    const nomsAttendus = new Set(definitionsApplications().map(({ name }) => name));
    for (const application of await listerApplications()) {
      if (nomsAttendus.has(application.name)) await supprimerApplication(application);
    }
  }

  const api = await creerApi();
  const plans = await creerPlans(api.id);
  await demarrerApi(api.id);
  const abonnements = await creerApplications(api.id, plans);

  const recapitulatif = {
    horodatage: new Date().toISOString(),
    api: { identifiant: api.id, nom: api.name, chemin: cheminContexte, cible: urlApiCible },
    plans: Object.entries(plans).map(([nom, plan]) => ({
      nom,
      identifiant: plan.id,
      securite: plan.security?.type ?? plan.securityType,
    })),
    abonnements,
  };

  await ecrireRecapitulatif(recapitulatif);

  journal('--------------------------------------------------------------');
  journal(`API disponible sur http://localhost:8082${cheminContexte}`);
  journal('Console Gravitee : http://localhost:8084 (admin / admin)');
  journal('Portail          : http://localhost:4100');
  journal('--------------------------------------------------------------');
};

try {
  await amorcer();
  journal('amorcage termine');
} catch (erreur) {
  console.error(`[amorcage] echec : ${erreur.message}`);
  process.exitCode = 1;
}
