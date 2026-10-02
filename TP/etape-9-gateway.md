# Étape 9 — Placer une gateway devant l'API

## Problème

L'entreprise réfléchit à une solution d'API Management pour mieux gérer
toutes ses API. Arnaud, le DSI, veut d'abord l'expérimenter sur MyBrew.

Aujourd'hui, la SPA appelle l'API MyBrew en direct : toute requête arrive
jusqu'à l'API, même sans jeton ou envoyée par une application que personne
n'a déclarée. C'est l'API seule qui fait le tri, et rien ne permet de savoir,
en un seul endroit, quelles applications l'appellent.

## Objectif

On place une gateway **Gravitee** entre la SPA et l'API. La SPA n'appelle plus
que la gateway, qui relaie vers l'API.

La gateway fait une première vérification, grossière (*coarse grained*) : le
jeton est-il signé par Keycloak, encore valide, et obtenu par une application
déclarée dans Gravitee ? Sinon, elle répond `401` sans déranger l'API. L'API
garde sa vérification fine : audience, utilisateur, permissions.

```
Navigateur (SPA)          Gateway Gravitee                    API MyBrew
   │  GET /mybrew/boissons    │                                    │
   │  jeton ────────────────> │ signature (clés de Keycloak),      │
   │                          │ expiration, application abonnée    │
   │                          │  GET /boissons, jeton ───────────> │ audience,
   │  boissons <───────────── │ <───────────────────────────────── │ permissions
```

## Todo

Démarrez la stack :

```bash
make start
```

Gravitee met une minute à démarrer. Ouvrez sa console
(<http://localhost:8084>, `admin` / `admin`) : elle ne contient encore aucune
API. Les clients Keycloak des étapes précédentes sont déjà configurés, ainsi
que les utilisateurs `gerard` (mot de passe `gerard`) et `sara` (mot de passe
`sara`).

### 1. Déclarer l'API dans Gravitee

Dans la console, créez une API (*APIs* > *Add API* > *Create V4 API*) de type
*Proxy Generic Protocol* > *HTTP Proxy* :

- *Context-path* `/mybrew` : la gateway expose l'API sur
  `http://localhost:8082/mybrew` ;
- *Target url* `http://api:3000` : l'adresse de l'API MyBrew, vue depuis le
  réseau de la stack ;
- gardez le plan proposé, *Default Keyless (UNSECURED)* : il laisse passer
  tout le monde.

Terminez par *Save & Deploy API*, puis appelez l'API à travers la gateway :

```bash
curl -i http://localhost:8082/mybrew/boissons
```

<details>
<summary>Indice : Création de l'API</summary>

1. *APIs* > *Add API* > *Create V4 API*.
2. *API name* : `MyBrew`, *Version number* : `1.0`, puis *Validate my API
   details*.
3. *Proxy Generic Protocol*, puis *Select my API architecture*.
4. *HTTP Proxy*, puis *Select my entrypoints*.
5. *Context-path* : `/mybrew`, puis *Validate my entrypoints*.
6. *Target url* : `http://api:3000`, puis *Validate my endpoints*.
7. *Validate my plans*, puis *Save & Deploy API*.
</details>

### 2. Faire passer la SPA par la gateway

Dans `docker-compose.yml`, la variable `WEB_URL_API` du service `web` donne
l'adresse de l'API à la SPA. Remplacez
`${API_URL_DIRECTE:-http://localhost:3000}` par
`${API_URL_GATEWAY:-http://localhost:8082/mybrew}`, puis relancez :

```bash
make start
```

Rechargez <http://localhost:4200> et connectez-vous avec `gerard` : tout
fonctionne, en passant par la gateway.

Mais la gateway laisse tout passer. Rappelez la commande du point 1, sans
jeton : la réponse `401` `Jeton d'accès manquant, invalide ou expiré.` vient
de l'API MyBrew elle-même, la requête l'a atteinte.

<details>
<summary>Indice : SPA derrière la gateway</summary>

```yaml
      WEB_URL_API: ${API_URL_GATEWAY:-http://localhost:8082/mybrew}
```
</details>

### 3. Vérifier le jeton sur la gateway

Dans l'API `MyBrew` de la console, menu *Consumers*, ajoutez un plan *JWT*
(*Add new plan* > *JWT*). Avec ce plan, la gateway vérifie la signature du
jeton grâce aux clés publiques de Keycloak :

- *Auto validate subscription* activé : les abonnements à ce plan sont
  acceptés sans validation manuelle ;
- *JWKS resolver* `JWKS_URL` et *Resolver parameter* : l'URL des clés
  publiques du realm, vue depuis le réseau de la stack,
  `http://keycloak:8080/realms/mybrew/protocol/openid-connect/certs` ;
- *Client ID claim* `azp` : le claim du jeton qui dit quelle application l'a
  obtenu.

Publiez ce plan, fermez le plan *Default Keyless (UNSECURED)*, puis
redéployez l'API avec *Deploy API* dans le bandeau *This API is out of sync*.

Rechargez la SPA : elle n'affiche plus rien. Rappelez la commande du point 1 :
cette fois, c'est la gateway qui répond `401` (`"message":"Unauthorized"`).

<details>
<summary>Indice : Plan JWT</summary>

1. *APIs* > `MyBrew` > *Consumers* > *Add new plan* > *JWT*.
2. *Name* : `Jeton Keycloak`, activez *Auto validate subscription*, puis
   *Next*.
3. *JWKS resolver* : `JWKS_URL`.
4. *Resolver parameter* :
   `http://keycloak:8080/realms/mybrew/protocol/openid-connect/certs`.
5. *Client ID claim* : `azp`, puis *Next* et *Create*.
6. Onglet *STAGING* : sur la ligne `Jeton Keycloak`, *Publish the plan*.
7. Onglet *PUBLISHED* : sur la ligne *Default Keyless (UNSECURED)*, *Close the
   plan*, tapez le nom du plan pour confirmer.
8. *Deploy API* dans le bandeau en haut de la page, puis *Deploy*.
</details>

### 4. Déclarer la SPA dans Gravitee

La gateway n'accepte que les jetons des applications abonnées au plan. Créez
l'application de la SPA (menu *Applications* > *Add*) avec le *Client ID*
`mybrew-web`, le client Keycloak de la SPA. Abonnez-la au plan
`Jeton Keycloak` de l'API `MyBrew` (onglet *Subscriptions* de
l'application).

Rechargez la SPA : toujours rien. Dans les outils de développement du
navigateur (onglet *Réseau*), la requête `OPTIONS` est refusée. Avant chaque
appel avec un jeton, le navigateur envoie cette requête de vérification CORS,
sans jeton. Configurez le CORS de l'API dans Gravitee (menu *Entrypoints* >
onglet *CORS*) :

- *Allow-Origin* : l'adresse de la SPA, `<URL de la SPA>`
  (`http://localhost:4200` en local) ;
- *Access-Control-Allow-Methods* : `GET`, `POST`, `DELETE` ;
- *Allow-Headers* : `authorization`, `content-type`, `x-api-key`.

Enregistrez et redéployez l'API.

<details>
<summary>Indice : Application et CORS</summary>

1. *Applications* > *Add*. *Name* : `MyBrew web`, *Description* : `SPA
   MyBrew`, *Client ID* : `mybrew-web`, puis *Create*.
2. Onglet *Subscriptions* > *Create a subscription*, cherchez `MyBrew`,
   choisissez le plan `Jeton Keycloak`, puis *Create* : le statut est
   `ACCEPTED`.
3. *APIs* > `MyBrew` > *Entrypoints* > onglet *CORS* : activez *Enable CORS*.
4. *Allow-Origin* : `<URL de la SPA>`, validez avec Entrée.
5. *Access-Control-Allow-Methods* : `GET`, `POST`, `DELETE`.
6. *Allow-Headers* : `authorization`, `content-type`, `x-api-key`, validez
   chacun avec Entrée.
7. *Save*, puis *Deploy API* dans le bandeau et *Deploy*.
</details>

## Comment tester

Rechargez <http://localhost:4200> avec `gerard` : le catalogue s'affiche et il
peut se faire couler un café, à travers la gateway.

Sans jeton, la gateway répond `401` sans appeler l'API :

```bash
curl -i http://localhost:8082/mybrew/boissons
```

Un jeton valide ne suffit pas : il doit venir d'une application abonnée.
Demandez un jeton pour le `fournisseur` (client credentials, comme à
l'étape 2) : l'API l'accepte en direct, mais la gateway le refuse, car aucune
application Gravitee n'a le *Client ID* `fournisseur`.

```bash
JETON=$(curl -s -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=client_credentials \
  -d client_id=fournisseur \
  -d client_secret=secret-fournisseur-8aa3aee31f9a008f | sed -E 's/.*"access_token":"([^"]+)".*/\1/')

curl -i -H "Authorization: Bearer $JETON" http://localhost:3000/boissons
curl -i -H "Authorization: Bearer $JETON" http://localhost:8082/mybrew/boissons
```

## Ça ne fonctionne pas ?

- La console Gravitee ne répond pas : Gravitee met une minute à démarrer,
  suivez-le avec `docker compose logs -f management-api gateway`.
- `404` `No context-path matches the request URI.` : l'API n'est pas déployée,
  ou son *Context-path* n'est pas `/mybrew`.
- Une modification de la console n'a pas d'effet : redéployez l'API avec
  *Deploy API* (bandeau *This API is out of sync*).
- `401` de la gateway avec un jeton de la SPA :
  - l'application `mybrew-web` n'est pas abonnée au plan, ou l'abonnement
    attend une validation (*Auto validate subscription* désactivé : acceptez-le
    dans *Consumers* > *Subscriptions*) ;
  - *Client ID claim* n'est pas `azp` ;
  - *Resolver parameter* pointe sur `localhost` au lieu de `keycloak:8080` :
    pour la gateway, `localhost` est son propre conteneur.
- Erreur CORS dans la console du navigateur : CORS n'est pas activé sur l'API
  dans Gravitee, ou *Allow-Origin* n'est pas exactement l'adresse de la SPA
  (schéma, domaine et port, sans `/` final).
- La SPA appelle toujours le port 3000 : `docker-compose.yml` n'est pris en
  compte qu'après `make start`.
- `make clean` supprime aussi la configuration de Gravitee : elle est alors à
  refaire.

## Bonus

### 1 - Contourner la gateway

La gateway ne protège que ce qui passe par elle. L'API MyBrew est toujours
joignable en direct sur le port 3000 : une application non déclarée dans
Gravitee peut l'appeler sans passer par la gateway, comme le fournisseur
ci-dessus. Que faudrait-il changer dans `docker-compose.yml` pour l'empêcher ?
Quels clients de l'API faudrait-il alors faire passer par la gateway ?

<details>
<summary>Indice : Fermer l'accès direct</summary>

Supprimer le bloc `ports` du service `api` : l'API ne serait plus joignable
que depuis le réseau de la stack, donc par la gateway. Le fournisseur, qui
appelle `http://localhost:3000`, devrait alors passer par
`http://localhost:8082/mybrew`, avec sa propre application dans Gravitee.
Ne le faites pas ici : les étapes suivantes s'appuient sur le port 3000.
</details>

### 2 - Faire passer l'ascenseur par la gateway

L'ascenseur appelle l'API en direct (`ASCENSEUR_URL_API` dans
`docker-compose.yml`). Faites-le passer par la gateway : il lui faut sa propre
application dans Gravitee, avec le *Client ID* de son client Keycloak.
L'ascenseur tourne dans le réseau de la stack : la gateway s'y appelle
`gateway`. Lancez-le avec `make ascenseur` et commandez une boisson.

<details>
<summary>Indice : Ascenseur derrière la gateway</summary>

```yaml
      ASCENSEUR_URL_API: http://gateway:8082/mybrew
```

Dans la console, *Applications* > *Add* : *Name* `Ascenseur`, *Description*
`Ascenseur`, *Client ID* `ascenseur`, puis abonnez-la au plan `Jeton Keycloak` de l'API `MyBrew`.
L'ascenseur n'est pas un navigateur : pas de CORS à configurer pour lui.
</details>
