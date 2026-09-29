# Étape 3 — Authentifier les utilisateurs avec le flow authorization code + PKCE

## Problème

Des personnes qui ne font pas partie de l'entreprise s'amusent à se faire
couler des cafés. La clé d'API ne les arrête pas : elle est dans le code de la
SPA, que n'importe quel navigateur peut lire.

```bash
curl -i -X POST http://localhost:3000/preparations \
  -H 'x-api-key: cle-mybrew-web-b4b213eacc3e876c' \
  -H 'Content-Type: application/json' \
  -d '{"idBoisson":"espresso"}'
```

## Objectif

Seuls les utilisateurs enregistrés dans Keycloak peuvent se faire couler une
boisson. La SPA redirige l'utilisateur vers la page de connexion de Keycloak,
qui la renvoie vers la SPA avec un **code** à usage unique. La SPA échange ce
code contre un jeton d'accès, qu'elle présente ensuite à l'API.

La SPA tourne dans le navigateur : elle ne peut pas garder de secret. Pour que
personne d'autre ne puisse échanger le code à sa place, elle génère un secret
jetable (`code_verifier`), envoie son empreinte (`code_challenge`) au moment de
la redirection, puis le secret lui-même lors de l'échange. C'est le flow
**authorization code + PKCE**.

```
Navigateur (SPA)                                 Keycloak
   │  1. redirection vers la page de connexion
   │     + code_challenge ─────────────────────────> │
   │                                                 │ 2. l'utilisateur
   │  3. retour vers la SPA avec un code <────────── │    se connecte
   │  4. code + code_verifier ─────────────────────> │
   │  5. jeton d'accès <──────────────────────────── │
   │
   │  6. POST /preparations
   │     Authorization: Bearer <jeton>
   └───────────────────────────────────────────────> API MyBrew
```

| Requête sur `POST /preparations` | Réponse attendue |
| --- | --- |
| Pas de jeton | `401 Unauthorized` |
| Jeton invalide, expiré ou pas destiné à `mybrew-api` | `401 Unauthorized` |
| Jeton valide destiné à `mybrew-api` | `201 Created` |

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak (<http://localhost:18080>, `admin` / `admin`),
sélectionnez le realm `mybrew`. Les clients `mybrew-api` et `fournisseur` de
l'étape précédente y sont déjà.

### 1. Déclarer la SPA dans Keycloak

Créez un client `mybrew-web`. C'est une application publique : *Client
authentication* reste désactivé et seul le *Standard flow* est coché.
Exigez PKCE pour que Keycloak refuse toute demande de code sans
`code_challenge`. Renseignez l'adresse de la SPA dans *Valid redirect URIs*
et dans *Web origins*.

Comme pour le fournisseur, ajoutez un mapper *Audience* qui inclut
`mybrew-api` sur la ligne `mybrew-web-dedicated` de l'onglet *Client scopes*.

<details>
<summary>Indice : Création du client mybrew-web</summary>

1. *Clients* > *Create client*.
2. *Client ID* : `mybrew-web`, puis *Next*.
3. Laissez *Client authentication* désactivé. Dans *Authentication flow*,
   laissez seulement *Standard flow* coché (décochez *Direct access grants*).
   Activez *Require PKCE* : la méthode `S256` est sélectionnée. Puis *Next*.
4. *Valid redirect URIs* : `<URL de la SPA>/*`, *Web origins* :
   `<URL de la SPA>` (sans `/` ni `*` à la fin), où `<URL de la SPA>` est l'adresse de
   la SPA dans votre navigateur (en local : `http://localhost:4200`). Puis
   *Save*.
5. Onglet *Client scopes* > lien `mybrew-web-dedicated` > *Configure a new
   mapper* > *Audience*.
6. *Name* : `audience-mybrew-api`, *Included Client Audience* : `mybrew-api`,
   *Add to access token* activé. Puis *Save*.
</details>

### 2. Enregistrer un utilisateur

Menu *Users* > *Add user*, puis définissez son mot de passe dans l'onglet
*Credentials*.

<details>
<summary>Indice : Création de l'utilisateur</summary>

1. *Users* > *Add user*.
2. Renseignez *Username*, *Email*, *First name* et *Last name* (sinon Keycloak
   les demande à la première connexion), puis *Create*.
3. Onglet *Credentials* > *Set password* : choisissez un mot de passe et
   désactivez *Temporary*. Puis *Save*.
</details>

### 3. Récupérer un jeton d'accès à la main

Jouez le rôle de la SPA. Commencez par générer un secret jetable
(`code_verifier`) et son empreinte (`code_challenge`) :

```bash
VERIFIER=$(openssl rand -base64 48 | tr -d '=+/\n' | cut -c1-64)
CHALLENGE=$(printf %s "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '=\n')
```

Ouvrez ensuite dans le navigateur la page de connexion
`/realms/mybrew/protocol/openid-connect/auth`, avec les paramètres :

- `client_id` : le client de la SPA ;
- `response_type=code` : on demande un code ;
- `redirect_uri` : l'adresse de la SPA, où Keycloak renverra le code ;
- `code_challenge` : l'empreinte générée ci-dessus ;
- `code_challenge_method=S256` : la façon dont l'empreinte a été calculée.

Connectez-vous, puis échangez le code reçu contre un jeton en appelant
l'endpoint `/realms/mybrew/protocol/openid-connect/token` avec les paramètres :

- `grant_type=authorization_code` ;
- `client_id` : le client de la SPA ;
- `redirect_uri` : la même valeur que pour la page de connexion ;
- `code` : le code reçu ;
- `code_verifier` : le secret jetable généré ci-dessus.

Faites-le avant le point 5 : ensuite, la SPA récupère elle-même le code.

<details>
<summary>Indice : Demande de jeton à la main</summary>

Dans le même terminal, renseignez les adresses de Keycloak et de la SPA telles
qu'elles apparaissent dans votre navigateur (en local : `http://localhost:18080`
et `http://localhost:4200`), puis affichez l'URL de la page de connexion :

```bash
URL_KEYCLOAK=<URL de Keycloak>
URL_SPA=<URL de la SPA>
echo "$URL_KEYCLOAK/realms/mybrew/protocol/openid-connect/auth?client_id=mybrew-web&response_type=code&redirect_uri=$URL_SPA/&code_challenge=$CHALLENGE&code_challenge_method=S256"
```

Ouvrez l'URL affichée dans le navigateur et connectez-vous avec votre
utilisateur. Keycloak vous renvoie vers la SPA avec une adresse de la forme
`<URL de la SPA>/?...&code=<code>` : copiez la valeur de `code` dans la barre
d'adresse (tout ce qui suit `code=`), puis échangez-le contre un jeton dans
les 5 minutes :

```bash
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=authorization_code \
  -d client_id=mybrew-web \
  -d redirect_uri=$URL_SPA/ \
  -d code_verifier=$VERIFIER \
  -d code=<code copié>
```

Le jeton est la valeur du champ `access_token` de la réponse.
</details>

### 4. Protéger la route

Appliquez `JetonGuard` à la méthode `preparer` de
`apps/api/src/preparations/preparations.controller.ts`, en plus de
`CleApiGuard`.

<details>
<summary>Indice : Application du guard sur la route</summary>

```ts
@Post()
@UseGuards(CleApiGuard, JetonGuard)
preparer(
```
</details>

Relancez ensuite :

```bash
make start
```

Ouvrez <http://localhost:4200> et essayez de vous faire couler un café : la SPA
ne présente pas encore de jeton, l'API refuse la commande avec « Accès non
autorisé ».

### 5. Brancher la SPA sur Keycloak

Dans `apps/web/docker/configuration.json.modele`, renseignez le `clientId` de
la SPA. Au démarrage, la SPA redirige alors vers la page de connexion et
ajoute le jeton aux appels vers l'API.

<details>
<summary>Indice : Configuration de la SPA</summary>

```json
  "keycloak": {
    "autorite": "${WEB_KEYCLOAK_AUTORITE}",
    "clientId": "mybrew-web"
  }
```
</details>

Relancez ensuite :

```bash
make start
```

## Comment tester

Gardez le jeton obtenu au point 3 dans une variable (il expire au bout de
5 minutes) :

```bash
JETON=<collez ici la valeur de access_token>
```

```bash
# Sans jeton : 401
curl -i -X POST http://localhost:3000/preparations \
  -H 'x-api-key: cle-mybrew-web-b4b213eacc3e876c' \
  -H 'Content-Type: application/json' \
  -d '{"idBoisson":"espresso"}'

# Avec le jeton : 201, et la préparation porte le nom de l'utilisateur
curl -i -X POST http://localhost:3000/preparations \
  -H 'x-api-key: cle-mybrew-web-b4b213eacc3e876c' \
  -H "Authorization: Bearer $JETON" \
  -H 'Content-Type: application/json' \
  -d '{"idBoisson":"espresso"}'
```

Ouvrez <http://localhost:4200> : vous êtes redirigé vers la page de connexion
de Keycloak. Une fois connecté, le bouton « Couler » fonctionne.
« Se déconnecter » vous ramène à la page de connexion.

## Ça ne fonctionne pas ?

- Un changement dans le code ou dans `configuration.json.modele` n'est pris en
  compte qu'après `make start`.
- Keycloak affiche `Invalid parameter: redirect_uri` : vérifiez *Valid redirect
  URIs* dans le client `mybrew-web`.
- Keycloak renvoie `Missing parameter: code_challenge_method` : l'URL de
  connexion ne contient pas de `code_challenge`, alors que le client exige
  PKCE. Vérifiez que la variable `CHALLENGE` n'est pas vide (`echo $CHALLENGE`).
- Keycloak affiche `Client not found` : vérifiez le `client_id` et que le
  client a été créé dans le realm `mybrew` et non dans `master`.
- L'échange du code renvoie `Code not valid` : le code a expiré ou a déjà
  servi, même lors d'un essai raté. Rouvrez l'URL de connexion pour en obtenir
  un nouveau.
- L'échange du code renvoie `PKCE verification failed` : le `code_verifier` ne
  correspond pas au `code_challenge` de l'URL. Régénérez `VERIFIER` et
  `CHALLENGE`, puis reprenez depuis l'URL de connexion, dans le même terminal.
- La SPA reste bloquée après la connexion : ouvrez la console du navigateur
  (F12). Une erreur CORS ou un appel à `/token` qui renvoie
  `403 Invalid origin` indique que *Web origins* ne correspond pas exactement
  à l'adresse de la SPA : même schéma (`http` ou `https`), même nom de domaine,
  même port, sans `/`, `*` ni chemin à la fin.
- L'API répond `Jeton d'accès manquant, invalide ou expiré.` : décodez le jeton
  sur <https://jwt.io> et vérifiez que `aud` contient `mybrew-api`.
- Regardez les logs avec `make logs`.
- `make clean` supprime les conteneurs : le client `mybrew-web` et
  l'utilisateur sont alors à recréer.

## Bonus

### 1 - Mon historique

Ouvrez l'historique : chacun y voit les cafés de tout le monde. La route
`GET /preparations` ne vérifie pas le jeton : l'API ne sait pas qui appelle et
renvoie toutes les préparations.

Faites en sorte que chaque utilisateur voie ses propres préparations. Créez un
second utilisateur et vérifiez que chacun ne voit que ses cafés (utilisez une
fenêtre de navigation privée pour le second).

<details>
<summary>Indice : Protection de la route de l'historique</summary>

Le décorateur `@UtilisateurCourant()` renvoie l'utilisateur du jeton dès que la
route est protégée par `JetonGuard` :

```ts
@Get()
@UseGuards(JetonGuard)
lister(@UtilisateurCourant() utilisateur: Utilisateur | undefined): Preparation[] {
```
</details>
