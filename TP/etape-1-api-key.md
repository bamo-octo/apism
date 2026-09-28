# Étape 1 — Sécuriser l'API avec une clé d'API

## Problème

Des employés ont développé leur propre front pour se faire couler des cafés.
Il appelle directement l'API MyBrew, et rien ne permet de le distinguer du front
officiel.

```
SPA MyBrew ──────────┐
                     ├──> POST /preparations ──> API MyBrew
Front des employés ──┘
```

## Objectif

La route `POST /preparations` doit exiger une clé d'API dans le header
`x-api-key`. Chaque front a sa propre clé :

| Requête | Réponse attendue |
| --- | --- |
| Pas de header `x-api-key` | `401 Unauthorized` |
| Clé inconnue | `403 Forbidden` |
| Clé connue | `201 Created` |

Les clés acceptées par l'API sont déjà déclarées dans `docker-compose.yml`
(variable `CLES_API` du service `api`) : une pour la SPA MyBrew
(`cle-mybrew-web-…`), une pour le front des employés (`cle-front-employes-…`).

## Todo

### 1. Écrire la vérification de la clé

Complétez la méthode `canActivate` de `apps/api/src/cles-api/cle-api.guard.ts`.
La clé reçue est déjà lue dans `cleApi`, et la liste des clés acceptées est
disponible dans `CLES_API`.

Pour renvoyer une erreur, levez l'exception NestJS correspondante :
`UnauthorizedException` (401) ou `ForbiddenException` (403).

<details>
<summary>Indice : Vérification de la clé dans le guard</summary>

Remplacez `return true;` par :

```ts
if (!cleApi) {
  throw new UnauthorizedException("Clé d'API manquante.");
}

if (!CLES_API.includes(cleApi)) {
  throw new ForbiddenException("Clé d'API inconnue.");
}

return true;
```
</details>

### 2. Protéger la route

Appliquez le guard `CleApiGuard` sur la méthode `preparer` de
`apps/api/src/preparations/preparations.controller.ts`, avec le décorateur
`@UseGuards`.

<details>
<summary>Indice : Application du guard sur la route</summary>

```ts
@Post()
@UseGuards(CleApiGuard)
preparer(
```
</details>

### 3. Donner sa clé à la SPA MyBrew

Dans la configuration du front, `apps/web/docker/configuration.json.modele`,
ajoutez un champ `cleApi` contenant la clé `cle-mybrew-web-…` déclarée dans
`CLES_API`. La SPA l'enverra alors dans le header `x-api-key` de chaque appel.

<details>
<summary>Indice : Configuration du front</summary>

```json
{
  "urlApi": "${WEB_URL_API}",
  "cleApi": "<cle-mybrew-web-…>"
}
```
</details>

Relancez ensuite l'application :

```bash
make start
```

## Comment tester

```bash
# Sans clé : 401
curl -i -X POST http://localhost:3000/preparations \
  -H 'Content-Type: application/json' -d '{"idBoisson":"ristretto"}'

# Clé inconnue : 403
curl -i -X POST http://localhost:3000/preparations \
  -H 'Content-Type: application/json' -H 'x-api-key: nimportequoi' -d '{"idBoisson":"ristretto"}'

# Clé du front des employés : 201
curl -i -X POST http://localhost:3000/preparations \
  -H 'Content-Type: application/json' -H 'x-api-key: <cle-front-employes-…>' -d '{"idBoisson":"ristretto"}'
```

Puis, sur <http://localhost:4200>, coulez un café : ça doit fonctionner. Dans
les outils de développement du navigateur (F12, onglet Réseau), vérifiez que
la requête `preparations` porte bien le header `x-api-key`.

## Ça ne fonctionne pas ?

- Un changement dans `docker-compose.yml`, dans le code ou dans la
  configuration du front n'est pris en compte qu'après `make start`.
- Si l'API ne démarre pas, regardez les logs avec `make logs`.
- Un *guard* NestJS s'exécute avant la route : s'il lève une exception, la
  route n'est pas appelée et l'API renvoie le code HTTP de l'exception.
- Vérifiez que la clé renseignée dans `cleApi` figure bien, à l'identique,
  dans `CLES_API`.
- Dans `configuration.json.modele`, n'oubliez pas la virgule à la fin de la
  ligne `urlApi`.

## Bonus

### 1 - Révoquer le front des employés

La direction décide de couper l'accès du front des employés. Retirez sa clé
de `CLES_API`, relancez `make start` et vérifiez que sa clé renvoie
maintenant un `403`.

### 2 - Une clé d'API est-elle un secret ?

Retrouvez la clé de la SPA sans lire le code, uniquement depuis le navigateur
(indice : <http://localhost:4200/configuration.json>). Qu'est-ce que ça
implique pour une clé d'API embarquée dans un front ? Que protège-t-elle
vraiment ?

### 3 - Protéger aussi l'historique

Faites en sorte que `GET /preparations` exige elle aussi une clé d'API.
