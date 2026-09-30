# Étape 6 — Réserver une boisson avec une permission

## Problème

Sara, la directrice, a goûté un café étonnant lors de son dernier voyage. Elle
l'a fait ajouter à la machine : le **café mystère**. Elle veut être la seule à
pouvoir le faire couler.

Mais l'API ne regarde que si l'utilisateur est connecté : Gérard voit le café
mystère dans le catalogue et peut se le faire couler.

## Objectif

Dans Keycloak, on crée une **permission** `couler-cafe-mystere` sur le client
`mybrew-api`, et on l'attribue à Sara. Keycloak l'inscrit alors dans les jetons
d'accès de Sara, dans le claim `resource_access` :

```json
"resource_access": {
  "mybrew-api": { "roles": ["couler-cafe-mystere"] }
}
```

L'API lit ce claim et ne montre le café mystère qu'aux utilisateurs qui ont la
permission.

```
Navigateur (SPA)                                   API MyBrew
   │  GET /boissons
   │  Authorization: Bearer <jeton de Sara> ────────> │ permission
   │  catalogue complet <──────────────────────────── │ couler-cafe-mystere ?
   │                                                  │
   │  GET /boissons                                   │
   │  Authorization: Bearer <jeton de Gérard> ──────> │
   │  catalogue sans le café mystère <─────────────── │
```

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak (<http://localhost:18080>, `admin` / `admin`),
sélectionnez le realm `mybrew`. Les clients des étapes précédentes y sont
déjà, ainsi que les utilisateurs `gerard` (mot de passe `gerard`) et `sara`
(mot de passe `sara`).

### 1. Constater le problème

Ouvrez <http://localhost:4200> et connectez-vous avec `gerard` : le café
mystère est dans le catalogue, et le bouton « Couler » fonctionne.

### 2. Créer la permission dans Keycloak

La permission appartient à l'API : créez un rôle `couler-cafe-mystere` dans
l'onglet *Roles* du client `mybrew-api`. Attribuez-le ensuite à `sara`, dans
l'onglet *Role mapping* de l'utilisatrice.

Vérifiez que la permission est bien dans le jeton de Sara : l'onglet *Client
scopes* > *Evaluate* du client `mybrew-web` montre le jeton d'accès qu'un
utilisateur recevrait.

<details>
<summary>Indice : Création et attribution de la permission</summary>

1. *Clients* > `mybrew-api` > onglet *Roles* > *Create role*.
2. *Role name* : `couler-cafe-mystere`, puis *Save*.
3. *Users* > `sara` > onglet *Role mapping* > *Assign role* > *Client roles*.
4. Cochez `mybrew-api` `couler-cafe-mystere`, puis *Assign*.
5. *Clients* > `mybrew-web` > onglet *Client scopes* > sous-onglet *Evaluate*.
   *Users* : `sara`, puis *Generated access token* : le claim
   `resource_access` contient la permission.
</details>

### 3. Filtrer le catalogue selon les permissions

La route qui liste les boissons est la méthode `lister()` de
`apps/api/src/boissons/boissons.controller.ts`. Protégez-la avec `JetonGuard`
pour que l'API sache qui demande le catalogue, puis ne renvoyez que les
boissons du `CATALOGUE` que l'utilisateur peut commander. L'utilisateur est
fourni par le décorateur `@UtilisateurCourant()`, et la fonction
`peutCommander(utilisateur, boisson)` compare la permission demandée par la
boisson à celles du jeton.

<details>
<summary>Indice : Filtre du catalogue</summary>

```ts
  @Get()
  @UseGuards(JetonGuard)
  lister(@UtilisateurCourant() utilisateur: Utilisateur | undefined): readonly Boisson[] {
    return CATALOGUE.filter((boisson) => peutCommander(utilisateur, boisson));
  }
```
</details>

Relancez la stack pour prendre en compte le code :

```bash
make start
```

## Comment tester

Rechargez <http://localhost:4200> avec `gerard` : le café mystère a disparu du
catalogue. Cliquez sur « Se déconnecter » et connectez-vous avec `sara` : le
café mystère est là, et elle peut se le faire couler.

## Ça ne fonctionne pas ?

- Rien n'a changé : le code n'est pris en compte qu'après `make start`.
- Sara ne voit pas le café mystère : son jeton date d'avant l'attribution de
  la permission. Déconnectez-vous et reconnectez-vous.
- La permission n'apparaît pas dans `resource_access.mybrew-api` : vérifiez
  que le rôle a été créé sur le client `mybrew-api`, et non sur `mybrew-web`
  ou dans *Realm roles*.
- « Accès non autorisé » sur le catalogue : la SPA n'envoie pas de jeton,
  vérifiez que vous êtes connecté.
- Regardez les logs avec `make logs`.
- `make clean` supprime les conteneurs : la permission est alors à recréer.

## Bonus

### 1 - Cacher n'est pas interdire

Le café mystère n'apparaît plus dans le catalogue de Gérard, mais l'API accepte
toujours de le préparer : il suffit de connaître son identifiant,
`cafe-mystere`. Jouez Gérard : récupérez un de ses jetons avec le device grant
de l'étape 5, et commandez le café mystère directement à l'API.

Faites en sorte que l'API refuse de préparer une boisson que l'utilisateur ne
peut pas commander. La préparation est faite par la méthode `preparer()` de
`apps/api/src/preparations/preparations.service.ts` : ajoutez-y le contrôle,
une fois la boisson trouvée, et levez une `ForbiddenException` si
`peutCommander(auteur, boisson)` est faux. Relancez `make start` et rejouez
la commande : l'API répond `403`.

<details>
<summary>Indice : Jeton de Gérard et commande du café mystère</summary>

```bash
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/auth/device \
  -d client_id=ascenseur
```

Ouvrez `verification_uri_complete`, connectez-vous avec `gerard` et acceptez.

```bash
DEVICE_CODE=<collez ici le device_code, sans les guillemets>
JETON=$(curl -s -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=urn:ietf:params:oauth:grant-type:device_code \
  -d client_id=ascenseur \
  -d device_code=$DEVICE_CODE | sed -E 's/.*"access_token":"([^"]+)".*/\1/')

curl -X POST http://localhost:3000/preparations \
  -H "Authorization: Bearer $JETON" \
  -H 'x-api-key: cle-ascenseur-17c912ea672e5b69' \
  -H 'Content-Type: application/json' \
  -d '{"idBoisson": "cafe-mystere"}'
```

Le jeton d'accès est valable 5 minutes : au-delà, recommencez depuis le début.
</details>

<details>
<summary>Indice : Contrôle de la permission</summary>

```ts
    if (!peutCommander(auteur, boisson)) {
      throw new ForbiddenException("Vous n'avez pas accès à cette boisson.");
    }
```
</details>
