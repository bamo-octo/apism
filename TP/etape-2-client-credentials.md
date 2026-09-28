# Étape 2 — Sécuriser un appel entre serveurs avec le flow client credentials

## Problème

Le fournisseur de la machine à café veut mettre à jour le catalogue des
boissons depuis son propre backend. L'API MyBrew expose pour cela deux routes :

- `POST /boissons` : ajoute une boisson ;
- `DELETE /boissons/{id}` : supprime une boisson.

Aujourd'hui, n'importe qui peut les appeler et vider le catalogue :

```bash
curl -i -X DELETE http://localhost:3000/boissons/espresso
```

## Objectif

Seul le backend du fournisseur doit pouvoir modifier le catalogue. Il n'y a
pas d'utilisateur derrière ce backend : c'est une application qui s'authentifie
elle-même auprès de Keycloak avec un identifiant et un secret, puis présente le
jeton obtenu à l'API. C'est le flow **client credentials**.

Keycloak doit connaître les deux parties : le **fournisseur**, qui demande des
jetons, et l'**API MyBrew**, à qui ces jetons sont destinés. L'API n'accepte
que les jetons dont l'audience (claim `aud`) contient `mybrew-api`.

```
                         1. client_id + client_secret
Backend du fournisseur ─────────────────────────────────> Keycloak
        │               <───────────────────────────────── 2. jeton d'accès
        │
        │  3. POST /boissons
        │     Authorization: Bearer <jeton>
        └────────────────────────────────────────────────> API MyBrew
                                                           4. vérifie le jeton
                                                              et son audience
```

| Requête | Réponse attendue |
| --- | --- |
| Pas de jeton | `401 Unauthorized` |
| Jeton invalide ou expiré | `401 Unauthorized` |
| Jeton valide, mais pas destiné à `mybrew-api` | `401 Unauthorized` |
| Jeton valide destiné à `mybrew-api` | `201 Created` / `204 No Content` |

Keycloak fait désormais partie de la stack : <http://localhost:18080>
(identifiant `admin`, mot de passe `admin`). Le realm `mybrew` y est déjà
créé.

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak, sélectionnez le realm `mybrew` (via *Manage realms*).

### 1. Déclarer l'API dans Keycloak

Créez un client `mybrew-api` (menu *Clients* > *Create client*). Il représente
l'API : il ne demande jamais de jeton, il sert à nommer le destinataire des
jetons. Désactivez donc tous ses flows.

<details>
<summary>Indice : Création du client mybrew-api</summary>

1. Cliquez sur *Manage realms* puis sélectionnez `mybrew` dans la liste (et
   non `master`).
2. *Clients* > *Create client*.
3. *Client ID* : `mybrew-api`, puis *Next*.
4. Laissez *Client authentication* désactivé et décochez tous les flows de
   *Authentication flow*. Puis *Next* et *Save* (l'écran *Login settings* peut
   rester vide).
</details>

### 2. Déclarer le fournisseur dans Keycloak

Créez un client `fournisseur`. C'est une application serveur, capable de garder
un secret : activez *Client authentication* et le flow *Service accounts
roles*. Les autres flows sont inutiles. Récupérez ensuite son secret dans
l'onglet *Credentials*.

Pour que ses jetons soient destinés à l'API, ajoutez-lui un mapper de type
*Audience* qui inclut le client `mybrew-api`. Les mappers propres à un client
se trouvent dans son onglet *Client scopes*, sur la ligne
`fournisseur-dedicated`.

<details>
<summary>Indice : Création du client fournisseur</summary>

1. *Clients* > *Create client*.
2. *Client ID* : `fournisseur`, puis *Next*.
3. Activez *Client authentication*. Dans *Authentication flow*, décochez
   *Standard flow* et *Direct access grants*, cochez *Service accounts roles*.
   Puis *Next* et *Save*.
4. Onglet *Credentials* : copiez le *Client secret*.
5. Toujours dans le client `fournisseur`, ouvrez l'onglet *Client scopes* et
   cliquez sur le lien `fournisseur-dedicated` (première ligne, décrite
   « Dedicated scope and mappers for this client »).
6. Dans l'onglet *Mappers* qui s'ouvre, cliquez sur *Configure a new mapper*
   (ou *Add mapper* > *By configuration* si un mapper existe déjà), puis
   choisissez *Audience* dans la liste.
7. *Name* : `audience-mybrew-api`, *Included Client Audience* : `mybrew-api`,
   *Add to access token* activé. Puis *Save*.
</details>

### 3. Récupérer un jeton d'accès

Jouez le rôle du backend du fournisseur : demandez un jeton à Keycloak en
appelant l'endpoint `/realms/mybrew/protocol/openid-connect/token` avec
`grant_type=client_credentials`, votre `client_id` et votre `client_secret`.

<details>
<summary>Indice : Demande de jeton</summary>

```bash
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=client_credentials \
  -d client_id=fournisseur \
  -d client_secret=<secret copié dans Keycloak>
```

Le jeton est la valeur du champ `access_token` de la réponse.
</details>

### 4. Protéger les routes

Le guard `JetonGuard` (`apps/api/src/jetons/jeton.guard.ts`) est déjà écrit :
il vérifie le jeton présent dans le header `Authorization: Bearer <jeton>`
(signature, émetteur, audience `mybrew-api` et expiration).
Appliquez-le avec `@UseGuards` sur les méthodes `ajouter` et `supprimer` de
`apps/api/src/boissons/boissons.controller.ts`.

<details>
<summary>Indice : Application du guard sur les routes</summary>

```ts
@Post()
@UseGuards(JetonGuard)
ajouter(@Body() boisson: BoissonDto): Boisson {
```

```ts
@Delete(':id')
@UseGuards(JetonGuard)
@HttpCode(204)
supprimer(@Param('id') id: string): void {
```
</details>

Relancez ensuite :

```bash
make start
```

## Comment tester

Gardez le jeton obtenu au point 3 dans une variable (il expire au bout de
5 minutes, redemandez-en un si besoin) :

```bash
JETON=<collez ici la valeur de access_token>
```

```bash
# Sans jeton : 401
curl -i -X POST http://localhost:3000/boissons \
  -H 'Content-Type: application/json' \
  -d '{"id":"mocha","libelle":"Mocha","description":"Chocolat et espresso.","intensite":3,"doseEauMl":40,"doseGrainsG":8,"doseLaitMl":100}'

# Avec le jeton du fournisseur : 201
curl -i -X POST http://localhost:3000/boissons \
  -H "Authorization: Bearer $JETON" \
  -H 'Content-Type: application/json' \
  -d '{"id":"mocha","libelle":"Mocha","description":"Chocolat et espresso.","intensite":3,"doseEauMl":40,"doseGrainsG":8,"doseLaitMl":100}'
```

Le Mocha apparaît sur <http://localhost:4200> et peut être coulé. Supprimez-le
ensuite :

```bash
# Sans jeton : 401
curl -i -X DELETE http://localhost:3000/boissons/mocha

# Avec le jeton du fournisseur : 204
curl -i -X DELETE http://localhost:3000/boissons/mocha -H "Authorization: Bearer $JETON"
```

## Ça ne fonctionne pas ?

- Un changement dans le code n'est pris en compte qu'après `make start`.
- Keycloak met quelques dizaines de secondes à démarrer : attendez que
  <http://localhost:18080> réponde.
- Keycloak répond `unauthorized_client` ou `invalid_client` : vérifiez le
  `client_id`, le secret, et que *Service accounts roles* est bien coché.
- L'API refuse un jeton qui vient d'être émis : décodez-le (voir le bonus 1) et
  vérifiez que `aud` contient `mybrew-api`. Un jeton obtenu avant l'ajout du
  mapper *Audience* ne la contient pas : redemandez-en un.
- Le client n'apparaît pas ? Vérifiez que vous l'avez créé dans le realm
  `mybrew` et non dans `master`.
- L'API répond `Jeton d'accès manquant, invalide ou expiré.` : le jeton dure
  5 minutes, redemandez-en un. Vérifiez aussi qu'il a été copié en entier,
  sans les guillemets.
- Regardez les logs avec `make logs`.
- `make clean` supprime les conteneurs : Keycloak repart alors de son état
  initial et les clients `mybrew-api` et `fournisseur` sont à recréer.

## Bonus

### 1 - Lire le jeton

Le jeton d'accès est un JWT : trois parties encodées en base64 et séparées par
des points. Collez-le sur <https://jwt.io> pour le décoder.

Retrouvez qui a émis le jeton (`iss`), pour quel client (`azp`), à qui il est
destiné (`aud`) et quand il expire (`exp`). L'API n'appelle jamais Keycloak pour valider un jeton :
comment peut-elle être sûre qu'il n'a pas été fabriqué par quelqu'un d'autre ?
Modifiez un caractère du jeton et rappelez l'API pour vérifier.

### 2 - Révoquer le fournisseur

Le secret du fournisseur a fuité. Dans l'onglet *Credentials* du client,
régénérez le secret. Vérifiez que l'ancien secret ne permet plus d'obtenir de
jeton. Qu'en est-il d'un jeton obtenu juste avant la régénération ?

### 3 - Le bon client, le bon jeton

Créez un second client `autre-application` sur le même modèle que
`fournisseur`, mais sans le mapper *Audience*. Obtenez un jeton pour lui et
appelez `POST /boissons` : que se passe-t-il, et pourquoi ?
