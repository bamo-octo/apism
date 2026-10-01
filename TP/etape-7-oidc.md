# Étape 7 — Afficher l'utilisateur connecté avec OpenID Connect

## Problème

Gérard s'est fait couler un café et a laissé MyBrew ouvert. Chantal arrive
juste après lui et se fait couler un café… sur le compte de Gérard. Elle ne
pouvait pas le savoir : la SPA affiche seulement « Bienvenue ! », sans dire qui
est connecté.

## Objectif

La SPA affiche le nom de l'utilisateur connecté. Pour le connaître, elle
s'appuie sur **OpenID Connect** (OIDC), la couche d'identité ajoutée à OAuth 2 :
à la connexion, Keycloak remet à la SPA, en plus du jeton d'accès destiné à
l'API, un **ID token** qui lui est destiné et qui décrit l'utilisateur.

Le contenu de l'ID token dépend des **scopes** demandés par la SPA. Elle ne
demande aujourd'hui que `openid` : l'ID token ne contient qu'un identifiant
technique. On va lui faire demander aussi le scope `profile`, qui ajoute le
prénom et le nom.

```
Navigateur (SPA)                                    Keycloak
   │  1. connexion, scope=openid profile ─────────────> │
   │  2. ID token (aud: mybrew-web)                     │
   │     given_name, family_name                        │
   │     + jeton d'accès (aud: mybrew-api) <─────────── │
   │
   │  « Bienvenue Gérard Dupont ! »
   │
   │  3. GET /boissons
   │     Authorization: Bearer <jeton d'accès>
   └──────────────────────────────────────────────────> API MyBrew
```

## Todo

Démarrez la stack :

```bash
make start
```

Dans la console Keycloak (<http://localhost:18080>, `admin` / `admin`),
sélectionnez le realm `mybrew`. Les clients des étapes précédentes y sont
déjà, ainsi que les utilisateurs `gerard` (mot de passe `gerard`), `sara`
(mot de passe `sara`) et `chantal` (mot de passe `chantal`).

### 1. Constater le problème

Ouvrez <http://localhost:4200> et connectez-vous avec `gerard` : l'en-tête
affiche « Bienvenue ! », sans nom.

### 2. Comparer l'ID token et le jeton d'accès

L'onglet *Client scopes* > *Evaluate* du client `mybrew-web` montre les jetons
qu'un utilisateur recevrait. Comparez l'ID token et le jeton d'accès de
`gerard` :

- `aud` : à qui le jeton est destiné ;
- `typ` : le type de jeton ;
- le nom de l'utilisateur, présent ou non.

Toujours dans l'onglet *Client scopes* de `mybrew-web`, regardez la liste des
scopes : `profile` est *Optional*, Keycloak ne l'inclut que si la SPA le
demande. Dans *Evaluate*, sélectionnez-le dans *Optional client scopes* et
regardez ce qu'il ajoute à l'ID token.

<details>
<summary>Indice : Évaluation des jetons</summary>

1. *Clients* > `mybrew-web` > onglet *Client scopes* > sous-onglet *Evaluate*.
2. *Users* : `gerard`.
3. *Generated ID token* : `aud` vaut `mybrew-web`, `typ` vaut `ID`, et il n'y a
   pas de nom.
4. *Generated access token* : `aud` vaut `mybrew-api`, `typ` vaut `Bearer`.
5. *Optional client scopes* : sélectionnez `profile`, puis revenez sur
   *Generated ID token* : `given_name` et `family_name` sont apparus.
</details>

### 3. Demander le scope `profile`

Les scopes demandés par la SPA se règlent avec `keycloak.scope` dans
`apps/web/docker/configuration.json.modele`. Les scopes sont séparés par des
espaces, et `openid` doit toujours être présent.

<details>
<summary>Indice : Scopes de la SPA</summary>

```json
    "scope": "openid profile",
```
</details>

Relancez la stack pour prendre en compte la configuration :

```bash
make start
```

## Comment tester

Rechargez <http://localhost:4200>, cliquez sur « Se déconnecter » et
reconnectez-vous avec `gerard` : l'en-tête affiche « Bienvenue Gérard
Dupont ! ». Déconnectez-vous et connectez-vous avec `chantal` : c'est
maintenant « Bienvenue Chantal Lefebvre ! ».

## Ça ne fonctionne pas ?

- Toujours « Bienvenue ! » : la SPA garde l'ID token reçu à la connexion.
  Cliquez sur « Se déconnecter » et reconnectez-vous.
- Rien n'a changé : la configuration n'est prise en compte qu'après
  `make start`. Vérifiez le scope dans <http://localhost:4200/configuration.json>.
- « Connexion impossible : Invalid scopes » : le nom du scope est mal écrit,
  ou le scope n'est pas rattaché au client `mybrew-web`.
- La SPA ne se connecte plus : `openid` a disparu de `keycloak.scope`.
- Regardez les logs avec `make logs`.

## Bonus

### 1 - La boisson préférée

Chantal boit toujours un ristretto : la SPA pourrait le mettre en avant dans le
catalogue. Il n'existe pas de scope standard pour ça : créez le vôtre.

L'utilisateur a un attribut *Boisson préférée*, dans l'onglet *Details*.
Renseignez-y `ristretto` pour `chantal`. Créez ensuite un client scope
`preferences` avec un mapper qui copie cet attribut dans le claim
`boisson_preferee`, dans l'ID token seulement : l'API n'en a pas besoin.
Rattachez-le à `mybrew-web` en *Optional* et demandez-le dans `keycloak.scope`.
Relancez `make start`, reconnectez-vous avec `chantal` : le ristretto porte
l'étiquette « Votre préférée ».

<details>
<summary>Indice : Client scope `preferences`</summary>

1. *Users* > `chantal` > onglet *Details* > *Boisson préférée* : `ristretto`,
   puis *Save*.
2. *Client scopes* > *Create client scope* > *Name* : `preferences`, puis
   *Save*.
3. Onglet *Mappers* > *Configure a new mapper* > *User Attribute*.
4. *Name* : `boisson-preferee`, *User Attribute* : `boisson-preferee`,
   *Token Claim Name* : `boisson_preferee`.
5. *Add to ID token* : On, *Add to access token* : Off, puis *Save*.
6. *Clients* > `mybrew-web` > onglet *Client scopes* > *Add client scope* >
   `preferences` > *Add* > *Optional*.

```json
    "scope": "openid profile preferences",
```
</details>

### 2 - Le consentement

Avec OIDC, l'utilisateur peut décider de ce qu'il partage avec l'application.
Activez *Consent required* dans l'onglet *Settings* de `mybrew-web`, puis
reconnectez-vous : Keycloak demande d'accepter le partage des scopes demandés.

### 3 - Le bon jeton pour la bonne API

L'ID token contient l'identité de l'utilisateur : pourquoi ne pas l'envoyer à
l'API ? Passez `keycloak.jetonPourApi` à `"id"` dans
`apps/web/docker/configuration.json.modele` : la SPA envoie alors l'ID token à
l'API à la place du jeton d'accès. Relancez `make start` et rechargez la SPA :
l'API refuse l'accès. Retrouvez dans l'ID token le claim qui l'explique, et
remettez `"acces"`.

<details>
<summary>Indice : Pourquoi l'API refuse l'ID token</summary>

L'API n'accepte que les jetons dont l'audience (`aud`) est `mybrew-api`.
L'ID token est destiné à la SPA : son `aud` vaut `mybrew-web`. Un jeton n'est
valable que pour le destinataire inscrit dans `aud`.
</details>
