# Étape 12 — Ouvrir l'API avec un portail développeur

## Problème

L'équipe communication veut afficher sur l'écran de la cafétéria les derniers
cafés coulés. Pour accéder à l'API, elle doit aujourd'hui demander à
l'administrateur Gravitee de lui créer une application et un abonnement à la
main. Et rien ne lui dit que l'API MyBrew existe, ni comment l'appeler.

## Objectif

On publie l'API MyBrew sur le **portail développeur** de Gravitee, avec un
plan **clé d'API** pour les applications sans utilisateur. L'équipe de
l'écran y trouve l'API, crée son application et s'abonne seule : le portail
lui donne sa clé. L'API et Keycloak ne changent pas.

```
Développeur ──> Portail Gravitee : crée l'application, s'abonne au plan Écran
            <── clé d'API

Écran            Gateway Gravitee                      API MyBrew
  │  GET /mybrew/preparations  │                            │
  │  X-Gravitee-Api-Key ─────> │ clé valide ?               │
  │                            │  GET /preparations ──────> │
```

## Todo

Démarrez la stack :

```bash
make start
```

Gravitee met une minute à démarrer. La gateway des étapes précédentes est
déjà configurée. Console Gravitee : <http://localhost:8084> (`admin` /
`admin`). Portail : <http://localhost:4100>. Le développeur de l'équipe
communication se connecte au portail avec `application1` (mot de passe
`application1`).

### 1. Constater que l'API est introuvable

Ouvrez le portail et connectez-vous (*Sign in*) avec `application1`. Le
catalogue (*Catalog*) est vide : l'API `MyBrew` est déployée sur la gateway,
mais elle n'est pas publiée sur le portail.

### 2. Publier l'API sur le portail

Dans la console, ouvrez *APIs* > `MyBrew` > *Configuration* > *General*. Dans
la *Danger Zone*, publiez l'API puis rendez-la publique. Rafraîchissez le
portail : `MyBrew` apparaît dans le catalogue.

Son seul plan, `Jeton Keycloak`, demande un jeton d'utilisateur : il ne
convient pas à un écran sur lequel personne ne se connecte.

<details>
<summary>Indice : Publier l'API</summary>

*Configuration* > *General* > *Danger Zone* : *Publish the API*, puis *Make
Public*, en confirmant à chaque fois.
</details>

### 3. Créer un plan clé d'API

Dans *Consumers* > *Plans*, ajoutez un plan *API Key* nommé `Écran`. Ses
abonnements sont validés automatiquement. Publiez le plan, puis redéployez
l'API.

<details>
<summary>Indice : Plan API Key</summary>

1. *Consumers* > *Plans* > *Add new plan* > *API Key*.
2. *Name* : `Écran`, activez *Auto validate subscription*, puis *Next*
   jusqu'à *Create*.
3. Le plan est créé dans l'onglet *Staging* : cliquez sur son icône *Publish
   the plan*, et confirmez.
4. *Deploy API* dans le bandeau en haut de la page, puis *Deploy*.
</details>

### 4. S'abonner depuis le portail

Sur le portail, toujours avec `application1`, créez l'application `Écran
cafétéria`, abonnez-la au plan `Écran` de `MyBrew` et récupérez la clé
d'API de l'abonnement.

<details>
<summary>Indice : Abonnement</summary>

1. *Catalog* > `MyBrew` > *Subscribe*.
2. Choisissez le plan `Écran`, puis *Next*.
3. *Create an app* : *Name* `Écran cafétéria`, *Description* `Écran de la
   cafétéria`, type *Simple*, puis validez l'abonnement.
4. *Applications* > `Écran cafétéria` > *Subscriptions* : la clé d'API
   s'affiche sur la ligne de `MyBrew`.
</details>

## Comment tester

Dans le terminal, renseignez la clé obtenue sur le portail :

```bash
CLE=<clé d'API>
```

1. L'écran lit l'historique, `200` :

   ```bash
   curl -i -H "X-Gravitee-Api-Key: $CLE" http://localhost:8082/mybrew/preparations
   ```

2. Sans la clé, la gateway refuse la requête (`401`) :

   ```bash
   curl -i http://localhost:8082/mybrew/preparations
   ```

3. L'écran ne peut pas couler de café : l'API répond `401` « Clé d'API
   manquante » (la clé de la SPA) :

   ```bash
   curl -i -X POST -H "X-Gravitee-Api-Key: $CLE" -H 'Content-Type: application/json' \
     -d '{"idBoisson": "expresso"}' http://localhost:8082/mybrew/preparations
   ```

4. Dans la console, *Consumers* > *Subscriptions* liste l'abonnement de
   `Écran cafétéria` au plan `Écran`.

## Ça ne fonctionne pas ?

- `MyBrew` n'est pas dans le catalogue : l'API n'est pas publiée ou pas
  publique, ou le portail n'a pas été rafraîchi.
- Le plan `Écran` n'est pas proposé : il est resté dans l'onglet *Staging*
  de la console.
- `401` avec la clé : l'API n'a pas été redéployée après la création du plan,
  l'en-tête n'est pas `X-Gravitee-Api-Key`, ou la clé est mal copiée.
- Le portail reste blanc ou affiche une erreur : Gravitee démarre encore.
  `make status` montre l'état des conteneurs.
- `make clean` efface la publication, le plan et les abonnements : ils sont
  alors à refaire.

## Bonus

### 1 - Documenter l'API

Sur le portail, l'équipe de l'écran ne sait toujours pas quelles routes
appeler. Ajoutez à l'API une page de documentation *OpenAPI* qui décrit
`GET /preparations`, publiez-la et consultez-la sur le portail (*Catalog* >
`MyBrew` > *Documentation*).

<details>
<summary>Indice : Page OpenAPI</summary>

1. *APIs* > `MyBrew` > *Documentation* > *Add new page* > *OpenAPI*.
2. *Name* : `Référence`, visibilité *Public*, puis collez le contenu
   ci-dessous.
3. Enregistrez, puis publiez la page.

```yaml
openapi: 3.0.3
info:
  title: MyBrew
  version: '1.0'
  description: Machine à café de l'entreprise.
servers:
  - url: http://localhost:8082/mybrew
security:
  - cleApi: []
paths:
  /preparations:
    get:
      summary: Liste les dernières préparations
      responses:
        '200':
          description: Préparations, de la plus récente à la plus ancienne
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Preparation'
components:
  securitySchemes:
    cleApi:
      type: apiKey
      in: header
      name: X-Gravitee-Api-Key
  schemas:
    Preparation:
      type: object
      properties:
        id: { type: string }
        idBoisson: { type: string }
        libelleBoisson: { type: string }
        horodatage: { type: string, format: date-time }
        sucres: { type: integer }
```
</details>
