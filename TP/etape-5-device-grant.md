# Étape 5 — Identifier l'utilisateur d'un appareil sans navigateur avec le device grant

## Problème

Les employés veulent commander leur café depuis l'ascenseur, pour qu'il soit
prêt quand ils arrivent à la machine. Un écran a été installé dans
l'ascenseur, mais la machine refuse ses commandes : elle ne sait pas qui
commande.

L'écran de l'ascenseur n'a ni navigateur ni clavier : impossible d'y afficher
la page de connexion de Keycloak comme le fait la SPA.

## Objectif

L'ascenseur demande à Keycloak un **code utilisateur** et l'affiche à l'écran.
L'utilisateur ouvre l'adresse indiquée sur son téléphone ou son ordinateur, se
connecte et saisit le code. Pendant ce temps, l'ascenseur interroge Keycloak
à intervalles réguliers : une fois la connexion validée, il reçoit un jeton
d'accès au nom de l'utilisateur. C'est le flow **device authorization grant**.

```
Ascenseur                                         Keycloak
   │  1. POST /auth/device ──────────────────────────> │
   │  2. device_code + user_code <──────────────────── │
   │                                                   │
   │  3. affiche l'adresse et le user_code             │
   │                          Téléphone de l'employé   │
   │                            4. connexion + code ──> │
   │                                                   │
   │  5. POST /token avec le device_code ────────────> │
   │     (répété jusqu'à ce que l'employé ait validé)  │
   │  6. jeton d'accès <────────────────────────────── │
   │
   │  7. POST /preparations
   │     Authorization: Bearer <jeton>
   └─────────────────────────────────────────────────> API MyBrew
```

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak (<http://localhost:18080>, `admin` / `admin`),
sélectionnez le realm `mybrew`. Les clients `mybrew-api`, `fournisseur` et
`mybrew-web` des étapes précédentes y sont déjà, ainsi que l'utilisateur
`gerard` (mot de passe `gerard`).

### 1. Constater le problème

L'interface de l'ascenseur est simulée par un petit outil en ligne de commande
(`apps/ascenseur/ascenseur.mjs`). Lancez-le et commandez un café :

```bash
make ascenseur
```

L'API refuse la commande avec « Accès non autorisé » : l'ascenseur n'envoie
pas de jeton d'accès.

### 2. Déclarer l'ascenseur dans Keycloak

Créez un client `ascenseur`. Comme la SPA, il ne garde pas de secret : laissez
*Client authentication* désactivé. Il n'utilise que le flow *OAuth 2.0 Device
Authorization Grant*.

Pour que ses jetons soient destinés à l'API, ajoutez-lui un mapper de type
*Audience* qui inclut le client `mybrew-api`, dans l'onglet *Client scopes*,
sur la ligne `ascenseur-dedicated`.

<details>
<summary>Indice : Création du client ascenseur</summary>

1. *Clients* > *Create client*.
2. *Client ID* : `ascenseur`, puis *Next*.
3. Laissez *Client authentication* désactivé. Dans *Authentication flow*,
   décochez *Standard flow* et *Direct access grants*, cochez *OAuth 2.0 Device
   Authorization Grant*. Puis *Next* et *Save*.
4. Onglet *Client scopes* > lien `ascenseur-dedicated` > *Configure a new
   mapper* > *Audience*.
5. *Name* : `audience-mybrew-api`, *Included Client Audience* : `mybrew-api`,
   *Add to access token* activé. Puis *Save*.
</details>

### 3. Récupérer un jeton à la main

Jouez le rôle de l'ascenseur. Demandez d'abord un code à Keycloak en appelant
l'endpoint `/realms/mybrew/protocol/openid-connect/auth/device` avec le
paramètre :

- `client_id` : le client de l'ascenseur.

La réponse contient :

- `device_code` : le secret de l'ascenseur, qu'il présentera pour obtenir le
  jeton ;
- `user_code` : le code affiché à l'utilisateur ;
- `verification_uri_complete` : l'adresse à ouvrir, code déjà rempli ;
- `expires_in` : la durée de validité des codes, en secondes.

Demandez ensuite le jeton à l'endpoint
`/realms/mybrew/protocol/openid-connect/token` avec les paramètres :

- `grant_type=urn:ietf:params:oauth:grant-type:device_code` : on présente un
  device code ;
- `client_id` : le client de l'ascenseur ;
- `device_code` : le `device_code` reçu.

Tant que l'utilisateur n'a pas validé, Keycloak répond
`authorization_pending`. Ouvrez alors `verification_uri_complete` dans votre
navigateur, connectez-vous avec `gerard` et acceptez l'accès (*Yes*).
Rappelez `/token` : le jeton d'accès arrive.

<details>
<summary>Indice : Device grant à la main</summary>

```bash
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/auth/device \
  -d client_id=ascenseur
```

```bash
DEVICE_CODE=<collez ici le device_code, sans les guillemets>
curl -X POST http://localhost:18080/realms/mybrew/protocol/openid-connect/token \
  -d grant_type=urn:ietf:params:oauth:grant-type:device_code \
  -d client_id=ascenseur \
  -d device_code=$DEVICE_CODE
```

Le jeton est la valeur du champ `access_token` de la réponse.
</details>

### 4. Brancher l'ascenseur sur Keycloak

Dans le service `ascenseur` de `docker-compose.yml`, renseignez
`ASCENSEUR_CLIENT_ID` avec le client créé au point 2 : l'ascenseur identifie
alors l'utilisateur avec le device grant avant de commander.

<details>
<summary>Indice : Configuration de l'ascenseur</summary>

```yaml
      ASCENSEUR_CLIENT_ID: 'ascenseur'
```
</details>

## Comment tester

```bash
make ascenseur
```

Choisissez une boisson : l'ascenseur affiche une adresse et un code. Ouvrez
l'adresse, connectez-vous avec `gerard` et acceptez : l'ascenseur confirme que
la boisson vous attend. Elle apparaît dans l'historique de
<http://localhost:4200>.

## Ça ne fonctionne pas ?

- `Service d'identification indisponible` : Keycloak met quelques dizaines de
  secondes à démarrer. Attendez que <http://localhost:18080> réponde, puis
  relancez `make ascenseur`.
- `Invalid client or Invalid client credentials` : vérifiez le `client_id`, et
  que le client a été créé dans le realm `mybrew` et non dans `master`.
- `Client is not allowed to initiate OAuth 2.0 Device Authorization Grant` :
  cochez *OAuth 2.0 Device Authorization Grant* dans le client.
- `expired_token` ou `Device code is expired` : les codes durent 10 minutes.
  Redemandez-en un (pour l'ascenseur, relancez `make ascenseur`).
- L'ascenseur affiche « Accès non autorisé » après la connexion : vérifiez le
  mapper *Audience* du client `ascenseur`.
- `The end user denied the authorization request` : l'utilisateur a cliqué sur
  *No*. Relancez.
- Regardez les logs avec `make logs`.
- `make clean` supprime les conteneurs : le client `ascenseur` est alors à
  recréer.

## Bonus

### 1 - Un code qui ne profite pas à n'importe qui

Un collègue malintentionné lance `make ascenseur` depuis son poste et envoie à
Gérard le lien `verification_uri_complete` : « Clique ici, je t'offre un
café ». Si Gérard se connecte, c'est le collègue qui reçoit un jeton au nom
de Gérard. Jouez la scène.

Limitez le risque : le code ne doit rester valable qu'une minute, et l'écran
d'acceptation doit indiquer clairement qui demande l'accès.

<details>
<summary>Indice : Durée de vie du code et nom du client</summary>

1. *Clients* > `ascenseur` > onglet *Settings* > *Name* : `Ascenseur du hall`.
   Puis *Save*.
2. Onglet *Advanced* > section *Advanced settings* > *OAuth 2.0 Device Code
   Lifespan* : `1` `Minutes`. Puis *Save*.

L'écran d'acceptation affiche maintenant « Grant Access to Ascenseur du
hall », et `expires_in` vaut `60`.
</details>

### 2 - Un jeton pour un seul café

L'ascenseur n'a besoin du jeton que le temps d'une commande. Or, au point 3,
Keycloak lui a aussi remis un `refresh_token` : avec lui, l'ascenseur pourrait
continuer à commander au nom de Gérard bien après son passage.

Faites en sorte que Keycloak ne remette plus de refresh token à l'ascenseur,
puis refaites le point 3 pour vérifier.

<details>
<summary>Indice : Refresh tokens du client</summary>

*Clients* > `ascenseur` > onglet *Advanced* > section *OpenID Connect
Compatibility Modes* > désactivez *Use refresh tokens*. Puis *Save*.

La réponse de `/token` ne contient plus de `refresh_token`.
</details>
