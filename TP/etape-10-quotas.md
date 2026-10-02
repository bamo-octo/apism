# Étape 10 — Limiter la consommation avec un quota

## Problème

La direction trouve que les développeurs boivent beaucoup trop de café. Rien
n'empêche aujourd'hui quelqu'un de se faire couler dix cafés dans la journée :
la SPA, la gateway et l'API acceptent toutes les commandes.

## Objectif

On ajoute un **quota** sur la gateway Gravitee : au plus **3 préparations par
jour et par utilisateur**. Au-delà, la gateway répond `429 Too Many Requests`
sans appeler l'API. L'API et Keycloak ne changent pas.

```
Navigateur (SPA)               Gateway Gravitee                 API MyBrew
   │  POST /mybrew/preparations    │                                │
   │  jeton de gerard ───────────> │ compteur de gerard : 1, 2, 3   │
   │                               │  POST /preparations ─────────> │
   │                               │                                │
   │  4e café ───────────────────> │ compteur de gerard : 3 / 3     │
   │  429 <─────────────────────── │                                │
```

## Todo

Démarrez la stack :

```bash
make start
```

Gravitee met une minute à démarrer. La gateway de l'étape précédente est déjà
configurée : l'API `MyBrew`, son plan `Jeton Keycloak` et l'application
`mybrew-web`. Console Gravitee : <http://localhost:8084> (`admin` / `admin`).
Utilisateurs : `gerard` (mot de passe `gerard`) et `sara` (mot de passe
`sara`).

### 1. Poser un quota sur les préparations

Dans l'API `MyBrew` de la console, menu *Policies*, ajoutez au plan
`Jeton Keycloak` un flow qui ne s'applique qu'aux commandes :

- *Path operator* `Equals`, *Path* `/preparations`, méthode `POST` ;
- dans la phase *Request*, une policy **Quota** : 3 requêtes (*Max requests
  (static)*) par 1 jour (*Static time duration* `1`, *Static time unit*
  `DAYS`). Laissez *Key* vide pour l'instant.

Enregistrez, puis redéployez l'API (*Deploy API* dans le bandeau).

Connectez-vous à <http://localhost:4200> avec `gerard` et faites-vous couler
4 cafés : le 4e est refusé (« Limite atteinte »).

<details>
<summary>Indice : Flow et policy Quota</summary>

1. *APIs* > `MyBrew` > *Policies*.
2. Sur la ligne du plan `Jeton Keycloak`, bouton *+* : *Flow name*
   `Quota de café`, *Path operator* `Equals`, *Path* `/preparations`,
   *Methods for your flow* `POST`, puis *Create*.
3. Dans la phase *Request* du flow, bouton *+*, cherchez `Quota`, puis
   *Select*.
4. *Max requests (static)* : `3`, *Static time duration* : `1`, *Static time
   unit* : `DAYS`, puis *Add policy*.
5. *Save*, puis *Deploy API* dans le bandeau en haut de la page, et
   *Deploy*.
</details>

### 2. Constater que le quota est partagé

Déconnectez-vous (*Se déconnecter*) et connectez-vous avec `sara`, qui n'a
encore rien bu aujourd'hui. Son premier café est refusé lui aussi.

Sans *Key*, la gateway compte les requêtes par abonnement : tous les
utilisateurs de la SPA passent par le même abonnement, celui de
l'application `mybrew-web`, et partagent donc les 3 cafés.

### 3. Compter par utilisateur

Le plan JWT place l'utilisateur du jeton (son claim `sub`) dans l'attribut
`user` de la requête. Renseignez la *Key* de la policy Quota avec cette
expression, enregistrez et redéployez :

```
{#context.attributes['user']}
```

Chaque utilisateur a maintenant son propre compteur : Sara peut se faire
couler ses 3 cafés.

<details>
<summary>Indice : Clé du quota</summary>

1. *APIs* > `MyBrew` > *Policies*, cliquez sur la policy *Quota* du flow
   `Quota de café`.
2. *Key* : `{#context.attributes['user']}`, puis *Update policy*.
3. *Save*, puis *Deploy API* dans le bandeau et *Deploy*.
</details>

## Comment tester

Avec `sara`, coulez 3 cafés : ils sont servis. Le 4e est refusé avec
« Limite atteinte » et le message de la gateway `Quota exceeded! You reached
the limit of 3 requests per 1 days`.

Dans les outils de développement du navigateur (onglet *Réseau*), la réponse
de chaque `POST preparations` porte les en-têtes du quota :

- `X-Quota-Limit` : la limite (`3`) ;
- `X-Quota-Remaining` : les cafés restants aujourd'hui ;
- `X-Quota-Reset` : la date de remise à zéro du compteur (en millisecondes
  depuis 1970).

L'historique de Sara ne contient que 3 préparations : la gateway a refusé
le 4e café sans appeler l'API.

## Ça ne fonctionne pas ?

- Le quota ne s'applique pas : l'API n'a pas été redéployée (*Deploy API*,
  bandeau *This API is out of sync*), ou le flow ne vise pas `POST`
  `/preparations`.
- Le catalogue ou l'historique sont refusés en `429` : le flow n'a pas de
  méthode `POST` ou son *Path operator* n'est pas `Equals`.
- Tout le monde est bloqué en même temps : la *Key* est vide, ou mal saisie
  (accolades, `#`, guillemets simples).
- Toute requête qui passe la gateway compte, même si l'API la refuse ensuite.
- Pour remettre tous les compteurs à zéro :

  ```bash
  docker compose exec mongodb mongosh gravitee --quiet --eval 'db.ratelimit.deleteMany({})'
  ```

- `make clean` remet aussi les compteurs à zéro, mais supprime la
  configuration du quota : elle est alors à refaire.

## Bonus

### 1 - Éviter les rafales

Un utilisateur peut vider son quota en trois clics. Ajoutez au même flow une
policy **Rate Limit** : au plus 1 café par minute et par utilisateur. Au-delà,
la gateway répond aussi `429`, avec les en-têtes `X-Rate-Limit-*`.

<details>
<summary>Indice : Rate Limit</summary>

Dans le flow `Quota de café`, phase *Request*, bouton *+*, policy `Rate
Limit` :

- *Key* : `{#context.attributes['user']}` ;
- *Max requests (static)* : `1` ;
- *Static time duration* : `1`, *Static time unit* : `MINUTES` ;
- activez *Add response headers*.

*Add policy*, puis faites glisser la policy *Rate Limit* avant la policy
*Quota* : sinon, un café refusé par le Rate Limit consomme quand même le
quota. *Save*, puis redéployez.
</details>

### 2 - Un stock limité pour toute l'entreprise

Le stock de grains ne permet de couler que 100 cafés par mois, tous
utilisateurs confondus. Ajoutez une deuxième limite qui s'applique à la SPA
entière, en plus des 3 cafés par jour et par utilisateur. Comment la gateway
distingue-t-elle les deux compteurs ?

<details>
<summary>Indice : Quota global</summary>

Dans le flow `Quota de café`, ajoutez une deuxième policy `Quota`, *Key*
vide : *Max requests (static)* `100`, *Static time duration* `1`, *Static time
unit* `MONTHS`. Sans *Key*, son compteur est celui de l'abonnement de
`mybrew-web`, partagé par tous les utilisateurs ; avec la *Key*, la gateway
ajoute l'utilisateur au nom du compteur.
</details>
