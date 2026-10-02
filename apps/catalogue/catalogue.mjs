import express from 'express';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const { PORT = '3001', CATALOGUE_JETON_OBLIGATOIRE, KEYCLOAK_URL_PUBLIQUE, KEYCLOAK_URL_INTERNE } = process.env;

const AUDIENCE = 'catalogue';
const EMETTEUR = `${KEYCLOAK_URL_PUBLIQUE}/realms/mybrew`;
const CLES_PUBLIQUES = createRemoteJWKSet(
  new URL(`${KEYCLOAK_URL_INTERNE}/realms/mybrew/protocol/openid-connect/certs`),
);

const CATALOGUE = [
  {
    id: 'ristretto',
    libelle: 'Ristretto',
    description: 'Très court, pour les jours de mise en production.',
    intensite: 5,
    doseEauMl: 25,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    id: 'espresso',
    libelle: 'Espresso',
    description: 'Court et serré, le classique du lundi matin.',
    intensite: 4,
    doseEauMl: 40,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    id: 'lungo',
    libelle: 'Lungo',
    description: 'Allongé, pour les réunions qui débordent.',
    intensite: 3,
    doseEauMl: 110,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    id: 'cappuccino',
    libelle: 'Cappuccino',
    description: 'Espresso, lait chaud et mousse généreuse.',
    intensite: 3,
    doseEauMl: 40,
    doseGrainsG: 8,
    doseLaitMl: 120,
  },
  {
    id: 'latte-macchiato',
    libelle: 'Latte macchiato',
    description: 'Beaucoup de lait, un peu de café, zéro remords.',
    intensite: 2,
    doseEauMl: 40,
    doseGrainsG: 7,
    doseLaitMl: 200,
  },
  {
    id: 'chocolat-chaud',
    libelle: 'Chocolat chaud',
    description: 'Pour celles et ceux qui ne carburent pas à la caféine.',
    intensite: 1,
    doseEauMl: 60,
    doseGrainsG: 0,
    doseLaitMl: 150,
  },
  {
    id: 'cafe-mystere',
    libelle: 'Café mystère',
    description: "Rapporté de voyage par la direction. Personne ne sait ce qu'il contient.",
    intensite: 5,
    doseEauMl: 30,
    doseGrainsG: 9,
    doseLaitMl: 0,
    permission: 'couler-cafe-mystere',
  },
];

/** Sans jeton, on ne connaît pas les permissions de l'utilisateur (`undefined`) : aucune boisson n'est filtrée. */
const peutCommander = (permissions, boisson) =>
  !permissions || !boisson.permission || permissions.includes(boisson.permission);

const application = express();
application.use(express.json());

application.use(async (requete, reponse, suivant) => {
  if (CATALOGUE_JETON_OBLIGATOIRE !== 'true') {
    return suivant();
  }

  const jeton = requete.get('authorization')?.replace(/^Bearer /, '');
  try {
    if (!jeton) {
      throw new Error('aucun jeton');
    }
    const { sub, aud, azp } = decodeJwt(jeton);
    console.log(`Jeton reçu : sub ${sub}, aud ${aud}, azp ${azp}`);

    const { payload } = await jwtVerify(jeton, CLES_PUBLIQUES, { issuer: EMETTEUR, audience: AUDIENCE });
    reponse.locals.permissions = payload.resource_access?.[AUDIENCE]?.roles ?? [];
    suivant();
  } catch (erreur) {
    console.log(`Jeton refusé : ${erreur.message}`);
    reponse.status(401).json({ message: "Jeton d'accès manquant, invalide ou expiré." });
  }
});

application.get('/boissons', (_requete, reponse) => {
  reponse.json(CATALOGUE.filter((boisson) => peutCommander(reponse.locals.permissions, boisson)));
});

application.get('/boissons/:id', (requete, reponse) => {
  const boisson = CATALOGUE.find(({ id }) => id === requete.params.id);

  if (!boisson) {
    return reponse.status(404).json({ message: `Boisson inconnue : ${requete.params.id}.` });
  }
  if (!peutCommander(reponse.locals.permissions, boisson)) {
    return reponse.status(403).json({ message: "Vous n'avez pas accès à cette boisson." });
  }
  reponse.json(boisson);
});

application.post('/boissons', (requete, reponse) => {
  if (CATALOGUE.some(({ id }) => id === requete.body.id)) {
    return reponse.status(409).json({ message: `La boisson ${requete.body.id} existe déjà.` });
  }

  CATALOGUE.push(requete.body);
  reponse.status(201).json(requete.body);
});

application.delete('/boissons/:id', (requete, reponse) => {
  const index = CATALOGUE.findIndex(({ id }) => id === requete.params.id);

  if (index === -1) {
    return reponse.status(404).json({ message: `Boisson inconnue : ${requete.params.id}.` });
  }

  CATALOGUE.splice(index, 1);
  reponse.status(204).end();
});

application.listen(Number(PORT), () => console.log(`Catalogue à l'écoute sur le port ${PORT}`));
