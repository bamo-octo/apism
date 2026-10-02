# Étape 8 — Appeler une autre API pour le compte de l'utilisateur avec Token Exchange

## Problème

Les achats gèrent désormais le catalogue des boissons dans leur propre
service, le **catalogue**. L'API MyBrew l'interroge pour lister les boissons et
pour vérifier celle qu'on lui demande de préparer.

Mais l'API l'appelle sans jeton : le catalogue ne sait pas qui demande. Il
renvoie donc tout, et Gérard voit à nouveau le café mystère réservé à Sara.
Pire, n'importe qui sur le réseau peut interroger le catalogue, et même y
ajouter ou supprimer des boissons.

## Objectif

Le catalogue exige un jeton dont l'audience (`aud`) est `catalogue`, et lit les
permissions de l'utilisateur dans ce jeton.

L'API MyBrew ne peut pas lui transmettre le jeton reçu de la SPA : il est
destiné à `mybrew-api`. Elle ne peut pas non plus demander un jeton en son nom
propre (client credentials) : le catalogue ne saurait plus qui est
l'utilisateur. Elle va **échanger** le jeton de l'utilisateur auprès de
Keycloak (**Token Exchange**) contre un jeton pour le même utilisateur, destiné
au catalogue.

```
Navigateur (SPA)            API MyBrew                Keycloak          Catalogue
   │  GET /boissons            │                          │                 │
   │  jeton (aud: mybrew-api) >│ 1. échange               │                 │
   │                           │  jeton + secret ───────> │                 │
   │                           │  jeton (aud: catalogue) <│                 │
   │                           │                                            │
   │                           │ 2. GET /boissons                           │
   │                           │  jeton (aud: catalogue) ─────────────────> │ permissions
   │  boissons <────────────── │  boissons de l'utilisateur <────────────── │ de l'utilisateur
```

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak (<http://localhost:18080>, `admin` / `admin`),
sélectionnez le realm `mybrew`. Les clients des étapes précédentes y sont
déjà, ainsi que le client `catalogue`, qui porte maintenant la permission
`couler-cafe-mystere` de Sara, et les utilisateurs `gerard` (mot de passe
`gerard`) et `sara` (mot de passe `sara`).

### 1. Constater le problème

Ouvrez <http://localhost:4200> et connectez-vous avec `gerard` : le café
mystère est revenu dans le catalogue.

Le catalogue n'est joignable que depuis le réseau de la stack. Interrogez-le
depuis le conteneur de l'API, sans aucun jeton : il répond.

```bash
docker compose exec api wget -qO- http://catalogue:3001/boissons
```

### 2. Protéger le catalogue

Dans `docker-compose.yml`, le service `catalogue` a une variable
`CATALOGUE_JETON_OBLIGATOIRE` : passez-la à `'true'` pour qu'il exige un jeton
d'audience `catalogue`. Relancez :

```bash
make start
```

Rechargez la SPA : « Catalogue indisponible ». L'API MyBrew n'envoie toujours
aucun jeton au catalogue.

<details>
<summary>Indice : Catalogue protégé</summary>

```yaml
      CATALOGUE_JETON_OBLIGATOIRE: 'true'
```
</details>

### 3. Transmettre le jeton de l'utilisateur ?

Le jeton envoyé par l'API au catalogue se règle avec la variable
`CATALOGUE_JETON` du service `api` :

- vide : aucun jeton ;
- `transmettre` : le jeton reçu de la SPA, tel quel ;
- `echanger` : un jeton obtenu par Token Exchange.

Essayez `transmettre`, relancez `make start` et rechargez la SPA : toujours
« Catalogue indisponible ». Regardez les logs du catalogue avec `make logs` :
quelle audience porte le jeton reçu ?

<details>
<summary>Indice : Pourquoi le catalogue refuse le jeton</summary>

```yaml
      CATALOGUE_JETON: 'transmettre'
```

Le catalogue logue `aud mybrew-api` puis `unexpected "aud" claim value` : le
jeton de la SPA est destiné à l'API MyBrew, pas au catalogue.
</details>

### 4. Autoriser l'API MyBrew à échanger des jetons

Pour échanger un jeton, l'API MyBrew doit s'authentifier auprès de Keycloak :
dans l'onglet *Settings* du client `mybrew-api`, activez *Client
authentication* et le *Standard Token Exchange*. Récupérez ensuite le secret
du client dans l'onglet *Credentials*.

L'API demande un jeton d'audience `catalogue` : Keycloak ne l'accepte que si
cette audience est prévue pour `mybrew-api`. Ajoutez un mapper *Audience*
`catalogue` dans le scope dédié du client, comme pour le fournisseur à
l'étape 2.

<details>
<summary>Indice : Configuration du client `mybrew-api`</summary>

1. *Clients* > `mybrew-api` > onglet *Settings* > *Capability config* :
   activez *Client authentication*, cochez *Standard Token Exchange*, puis
   *Save*.
2. Onglet *Credentials* : copiez le *Client Secret*.
3. Onglet *Client scopes* > lien `mybrew-api-dedicated` > *Configure a new
   mapper* > *Audience*.
4. *Name* : `audience-catalogue`, *Included Client Audience* : `catalogue`,
   *Add to access token* activé. Puis *Save*.
</details>

### 5. Échanger le jeton

Dans `docker-compose.yml`, passez `CATALOGUE_JETON` à `echanger` et
renseignez le secret copié dans `KEYCLOAK_CLIENT_SECRET`. Relancez :

```bash
make start
```

<details>
<summary>Indice : Échange de jeton</summary>

```yaml
      CATALOGUE_JETON: 'echanger'
      # Secret du client `mybrew-api`, nécessaire pour échanger un jeton.
      KEYCLOAK_CLIENT_SECRET: '<secret copié dans Keycloak>'
```
</details>

## Comment tester

Rechargez <http://localhost:4200> avec `gerard` : le catalogue s'affiche, sans
le café mystère. Cliquez sur « Se déconnecter » et connectez-vous avec
`sara` : le café mystère est là, et elle peut se le faire couler.

Dans `make logs`, le catalogue logue maintenant des jetons `aud catalogue,
azp mybrew-api` : c'est l'API MyBrew qui les a obtenus, pour le compte de
l'utilisateur (`sub`).

Le catalogue est protégé, y compris en direct : la commande du point 1 répond
maintenant `401`.

## Ça ne fonctionne pas ?

- Rien n'a changé : `docker-compose.yml` n'est pris en compte qu'après
  `make start`.
- `Échange de jeton refusé : Requested audience not available: catalogue` dans
  les logs de l'API : le mapper *Audience* `catalogue` manque sur `mybrew-api`.
- `Échange de jeton refusé : Invalid client or Invalid client credentials` :
  le secret de `KEYCLOAK_CLIENT_SECRET` est faux, ou *Client authentication*
  n'est pas activé.
- `Échange de jeton refusé : Standard token exchange is not enabled for the
  requested client` (ou un message proche) : cochez *Standard Token Exchange*
  sur `mybrew-api`.
- Sara ne voit pas le café mystère : vérifiez qu'elle a bien la permission
  `couler-cafe-mystere` du client `catalogue` dans *Role mapping*.
- Regardez les logs avec `make logs`.
- `make clean` supprime les conteneurs : la configuration de `mybrew-api` est
  alors à refaire, et son secret change.

## Bonus

### 1 - L'échange à la main

Jouez le rôle de l'API MyBrew : récupérez un jeton de Gérard avec le device
grant de l'ascenseur, puis échangez-le vous-même auprès de Keycloak. La
requête vers `/realms/mybrew/protocol/openid-connect/token` prend les
paramètres :

- `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` : le type
  d'échange ;
- `client_id` et `client_secret` : le client qui échange, `mybrew-api` ;
- `subject_token` : le jeton à échanger ;
- `subject_token_type=urn:ietf:params:oauth:token-type:access_token` : son
  type ;
- `audience=catalogue` : le destinataire du nouveau jeton.

Appelez le catalogue avec le jeton de départ, puis avec le jeton échangé, et
comparez dans les logs du catalogue `sub`, `aud` et `azp`.

<details>
<summary>Indice : Jeton de Gérard et échange</summary>

```bash
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/auth/device \
  -d client_id=ascenseur
```

Ouvrez `verification_uri_complete`, connectez-vous avec `gerard` et acceptez.

```bash
DEVICE_CODE=<collez ici le device_code, sans les guillemets>
SECRET=<secret du client mybrew-api>
JETON=$(curl -s -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=urn:ietf:params:oauth:grant-type:device_code \
  -d client_id=ascenseur \
  -d device_code=$DEVICE_CODE | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
JETON_CATALOGUE=$(curl -s -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=urn:ietf:params:oauth:grant-type:token-exchange \
  -d client_id=mybrew-api \
  -d client_secret=$SECRET \
  -d subject_token=$JETON \
  -d subject_token_type=urn:ietf:params:oauth:token-type:access_token \
  -d audience=catalogue | sed -E 's/.*"access_token":"([^"]+)".*/\1/')

docker compose exec api wget -qO- --header "Authorization: Bearer $JETON" http://catalogue:3001/boissons
docker compose exec api wget -qO- --header "Authorization: Bearer $JETON_CATALOGUE" http://catalogue:3001/boissons
```

Le jeton d'accès est valable 5 minutes : au-delà, recommencez depuis le début.
Le `sub` est le même : c'est toujours Gérard. `aud` passe de `mybrew-api` à
`catalogue`, et `azp` (le client qui a obtenu le jeton) de `ascenseur` à
`mybrew-api`.
</details>

### 2 - Et avec client credentials ?

Activez *Service account roles* sur `mybrew-api`, demandez un jeton avec
`grant_type=client_credentials` comme le fournisseur à l'étape 2, et appelez
le catalogue avec. Le catalogue l'accepte, mais qui est l'utilisateur ? Le
café mystère est-il visible ?

<details>
<summary>Indice : Jeton client credentials de l'API</summary>

```bash
JETON_API=$(curl -s -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=client_credentials \
  -d client_id=mybrew-api \
  -d client_secret=$SECRET | sed -E 's/.*"access_token":"([^"]+)".*/\1/')

docker compose exec api wget -qO- --header "Authorization: Bearer $JETON_API" http://catalogue:3001/boissons
```

Le `sub` est celui du compte de service de `mybrew-api` : le catalogue ne sait
plus pour qui l'API demande, et applique les permissions de l'API, pas celles
de l'utilisateur. Le café mystère n'est visible pour personne.
</details>
