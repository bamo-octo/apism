# Étape 4 — Renouveler le jeton d'accès avec un refresh token

## Problème

Gérard ouvre MyBrew à 8 h 30 pour son premier café et laisse l'onglet ouvert.
À 10 h, il clique sur « Couler » : « Accès non autorisé ». Son jeton d'accès a
expiré, et il doit recharger la page. C'est pareil à chaque café.

## Objectif

La SPA renouvelle son jeton d'accès en arrière-plan, sans que l'utilisateur ait
à se reconnecter. À la connexion, Keycloak lui a remis, en plus du jeton
d'accès, un **refresh token** : elle l'échange contre un nouveau jeton d'accès
un peu avant l'expiration de celui-ci.

Pourquoi ne pas simplement allonger la durée de vie du jeton d'accès ? L'API
vérifie le jeton seule, sans interroger Keycloak : un jeton volé reste
utilisable jusqu'à son expiration. Le refresh token, lui, repasse par Keycloak
à chaque renouvellement, et Keycloak peut le refuser.

```
Navigateur (SPA)                                 Keycloak
   │  1. POST /token
   │     grant_type=refresh_token
   │     refresh_token=<refresh token> ────────────> │
   │  2. nouveau jeton d'accès                       │ vérifie que la
   │     + nouveau refresh token <────────────────── │ session est active
   │
   │  3. POST /preparations
   │     Authorization: Bearer <nouveau jeton>
   └───────────────────────────────────────────────> API MyBrew
```

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak (<http://localhost:18080>, `admin` / `admin`),
sélectionnez le realm `mybrew`. Le client `mybrew-web` de l'étape précédente
y est déjà, ainsi que l'utilisateur `gerard` (mot de passe `gerard`).

### 1. Raccourcir la durée de vie du jeton d'accès

Pour ne pas attendre 5 minutes, réglez la durée de vie des jetons d'accès du
client `mybrew-web` à 1 minute, dans ses paramètres avancés.

<details>
<summary>Indice : Durée de vie du jeton d'accès</summary>

1. *Clients* > `mybrew-web` > onglet *Advanced*.
2. Section *Advanced settings* > *Access Token Lifespan* : `1` `Minutes`.
3. *Save* (le bouton de la section *Advanced settings*).
</details>

### 2. Constater le problème

Ouvrez <http://localhost:4200> et connectez-vous. Attendez une minute, puis
cliquez sur « Couler » : l'API refuse la commande avec « Accès non autorisé ».

### 3. Renouveler un jeton à la main

La SPA garde le résultat de la connexion dans le `sessionStorage` du
navigateur. Dans l'onglet de la SPA, ouvrez la console (F12 > *Console*) et
affichez le refresh token :

```js
JSON.parse(sessionStorage.getItem('0-mybrew-web')).authnResult.refresh_token
```

Échangez-le contre un nouveau jeton d'accès en appelant l'endpoint
`/realms/mybrew/protocol/openid-connect/token` avec les paramètres :

- `grant_type=refresh_token` : on présente un refresh token ;
- `client_id` : le client de la SPA ;
- `refresh_token` : le refresh token affiché dans la console.

Dans la réponse, comparez `expires_in` (durée de vie du jeton d'accès, en
secondes) et `refresh_expires_in` (celle du refresh token). Un nouveau
`refresh_token` est aussi renvoyé.

<details>
<summary>Indice : Renouvellement à la main</summary>

```bash
REFRESH=<collez ici le refresh token, sans les guillemets>
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=refresh_token \
  -d client_id=mybrew-web \
  -d refresh_token=$REFRESH
```

Le nouveau jeton est la valeur du champ `access_token` de la réponse.
</details>

### 4. Activer le renouvellement dans la SPA

Dans `apps/web/docker/configuration.json.modele`, activez
`renouvellementAutomatique` : la SPA renouvelle alors son jeton 30 secondes
avant son expiration.

<details>
<summary>Indice : Configuration de la SPA</summary>

```json
  "keycloak": {
    "autorite": "${WEB_KEYCLOAK_AUTORITE}",
    "clientId": "mybrew-web",
    "renouvellementAutomatique": true
  }
```
</details>

Relancez ensuite :

```bash
make start
```

## Comment tester

Ouvrez <http://localhost:4200>, connectez-vous, attendez plus d'une minute puis
cliquez sur « Couler » : la commande passe.

Dans l'onglet *Réseau* (F12 > *Network*), un appel à `token` part environ
toutes les 30 secondes. Sa charge utile contient
`grant_type=refresh_token`.

## Ça ne fonctionne pas ?

- Un changement dans `configuration.json.modele` n'est pris en compte qu'après
  `make start`. Rechargez ensuite la page (Ctrl+Maj+R).
- La console affiche `null` ou une erreur : vérifiez que vous êtes connecté
  et que la console est ouverte sur l'onglet de la SPA, pas sur celui de
  Keycloak.
- Le renouvellement à la main renvoie `invalid_grant` avec `Token is not
  active` ou `Session not active` : le refresh token a expiré ou la session a
  été fermée (déconnexion, `make clean`). Rechargez la SPA et récupérez un
  nouveau refresh token.
- Le renouvellement à la main renvoie `invalid_client` : vérifiez le
  `client_id`.
- L'appel à `token` de la SPA répond `403 Invalid origin` : vérifiez *Web
  origins* dans le client `mybrew-web`.
- Regardez les logs avec `make logs`.
- `make clean` supprime les conteneurs : le réglage de durée de vie du jeton
  est alors à refaire.

## Bonus

### 1 - Un refresh token ne sert qu'une fois

Un refresh token dure bien plus longtemps qu'un jeton d'accès : s'il est volé,
il permet d'obtenir de nouveaux jetons pendant tout ce temps. Refaites
l'échange du point 3 deux fois de suite avec le même refresh token : les deux
fonctionnent.

Faites en sorte que Keycloak refuse un refresh token déjà utilisé : chaque
renouvellement doit donner un nouveau refresh token et rendre l'ancien
inutilisable.

<details>
<summary>Indice : Rotation des refresh tokens</summary>

1. *Realm settings* > onglet *Tokens*.
2. Section *Refresh tokens* : activez *Revoke Refresh Token*, laissez *Refresh
   Token Max Reuse* à `0`. Puis *Save*.

Récupérez un nouveau refresh token dans la console, échangez-le une première
fois, puis une seconde : Keycloak répond `invalid_grant`.
La SPA, qui détenait le même refresh token, ne peut plus le renouveler non
plus : rechargez la page pour vous reconnecter.
</details>

### 2 - Couper l'accès à un utilisateur

Gérard quitte l'entreprise, mais il a gardé MyBrew ouvert sur son ordinateur
personnel. Coupez-lui l'accès depuis Keycloak, sans toucher à l'API ni à la
SPA. Vérifiez qu'au bout d'une minute au plus, il ne peut plus se faire
couler de café.

<details>
<summary>Indice : Fermeture de la session</summary>

1. *Users* > l'utilisateur > onglet *Sessions*.
2. Menu ⋮ de la session > *Sign out*.

Le jeton d'accès déjà émis reste accepté par l'API jusqu'à son expiration : le
renouvellement suivant échoue, et au rechargement la SPA affiche la page de
connexion. Plus le jeton d'accès est court, plus la coupure est rapide.
</details>
