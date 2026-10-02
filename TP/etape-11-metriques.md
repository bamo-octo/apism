# Étape 11 — Observer le trafic avec les métriques

## Problème

La direction a limité la consommation à 3 cafés par jour et par utilisateur,
mais elle ne sait pas si cette limite est bien dosée : combien de cafés sont
servis, combien sont refusés, en combien de temps ? La gateway voit passer
toutes les commandes, mais n'en garde aucune trace.

## Objectif

On demande à la gateway d'enregistrer une **métrique** par requête (statut,
temps de réponse, application, plan) dans Elasticsearch. La console Gravitee
les affiche dans un dashboard et dans les logs de l'API. L'API et Keycloak
ne changent pas.

```
Navigateur (SPA)          Gateway Gravitee                  API MyBrew
   │  POST /mybrew/preparations  │  POST /preparations ────────> │
   │ ──────────────────────────> │                               │
                                 │ une métrique par requête
                                 ▼
                           Elasticsearch <──── Console Gravitee (dashboard, logs)
```

## Todo

Démarrez la stack :

```bash
make start
```

Gravitee met une minute à démarrer. La gateway de l'étape précédente est déjà
configurée, quota compris. Console Gravitee : <http://localhost:8084>
(`admin` / `admin`). Utilisateurs : `gerard` (mot de passe `gerard`) et
`sara` (mot de passe `sara`).

### 1. Constater que la gateway ne garde rien

Connectez-vous à <http://localhost:4200> avec `gerard` et faites-vous couler
4 cafés : le 4e est refusé par le quota.

Dans la console, ouvrez *APIs* > `MyBrew` > *API Traffic* : *Total Requests*
est à `0`. Elasticsearch tourne, mais la gateway ne lui envoie rien : il n'a
même pas encore d'index, d'où le message d'erreur `Invalid instance type`.

### 2. Envoyer les métriques à Elasticsearch

Dans `docker-compose.yml`, service `gateway`, activez le reporter
Elasticsearch avec la variable `gravitee_reporters_elasticsearch_enabled`,
puis relancez la stack :

```bash
make start
```

Coulez de nouveau des cafés avec `gerard`, puis avec `sara`, jusqu'au refus.
Rafraîchissez *API Traffic* : il affiche le nombre de requêtes, les temps de
réponse, la répartition des statuts (`200-299` pour les cafés servis,
`400-499` pour les cafés refusés) et l'application qui appelle l'API.

<details>
<summary>Indice : Reporter Elasticsearch</summary>

```yaml
      gravitee_reporters_elasticsearch_enabled: 'true'
```
</details>

### 3. Retrouver le détail d'un café refusé

*APIs* > `MyBrew` > *Logs* liste chaque requête. La colonne *Endpoint
reached* est vide pour les cafés refusés : la gateway a répondu `429` sans
appeler l'API. Le détail d'une requête (icône œil) reste pauvre : par défaut,
la gateway ne journalise pas les en-têtes.

Avec le bouton *Configure Reporting*, activez le logging des requêtes et des
réponses (*Entrypoint*, *Endpoint*, *Request*, *Response*) avec leurs
*Headers*. Enregistrez, redéployez l'API, puis faites-vous refuser un café.
Le détail du `429` montre maintenant les en-têtes `X-Quota-*` de la réponse.

<details>
<summary>Indice : Logging de l'API</summary>

1. *APIs* > `MyBrew` > *Logs* > *Configure Reporting* (onglet *Reporter
   Settings*).
2. Activez *Entrypoint* et *Endpoint* (*Logging mode*), *Request* et
   *Response* (*Logging phase*), et *Headers* (*Content data*).
3. *Save* dans la barre en bas de la page, puis *Deploy API* dans le bandeau
   en haut de la page, et *Deploy*.
</details>

## Comment tester

1. Avec `sara`, coulez des cafés jusqu'au refus.
2. Dans *API Traffic*, *Total Requests* augmente, et la part `400-499` de
   *HTTP Status Repartition* grandit à chaque café refusé. Le filtre *HTTP
   Status* ne garde que certains statuts.
3. Dans *Logs*, ouvrez le dernier `POST /mybrew/preparations` en `429`.
   *Issues* donne le message du quota, et dans *Details*, la réponse envoyée
   au *Consumer* porte `X-Quota-Limit: 3` et `X-Quota-Remaining: 0`.

## Ça ne fonctionne pas ?

- *API Traffic* reste vide : la stack n'a pas été relancée après la
  modification de `docker-compose.yml` (`make start`), ou la période
  (*Timeframe*) n'inclut pas vos requêtes. Les requêtes faites avant
  l'activation du reporter ne sont pas enregistrées.
- La gateway ne démarre pas : elle attend Elasticsearch, qui met plus de temps
  à démarrer que les autres services. `make status` montre son état et
  `docker compose logs elasticsearch` ses logs.
- Le détail d'une requête n'a pas d'en-têtes : l'API n'a pas été redéployée
  après *Save* (bandeau *This API is out of sync*), ou la requête date
  d'avant le redéploiement.
- Tous les cafés sont refusés : le quota de la journée est épuisé. Pour
  remettre les compteurs à zéro :

  ```bash
  docker compose exec mongodb mongosh gravitee --quiet --eval 'db.ratelimit.deleteMany({})'
  ```

- `make clean` efface les métriques et la configuration du logging : elle est
  alors à refaire.

## Bonus

### 1 - Ne pas exposer les jetons dans les logs

Ouvrez le détail d'une requête : l'en-tête `Authorization` contient le jeton
de l'utilisateur, et `x-api-key` la clé d'API de la SPA. Toute personne qui
lit les logs peut rejouer ce jeton tant qu'il est valable. Modifiez la
configuration du logging pour ne plus journaliser ces en-têtes, tout en
gardant les en-têtes `X-Quota-*`.

<details>
<summary>Indice : Ne journaliser que les réponses</summary>

Les jetons et les clés d'API sont dans la requête ; les en-têtes du quota sont
dans la réponse. Dans *Configure Reporting*, désactivez *Request* (*Logging
phase*) et laissez *Response* et *Headers* activés. *Save*, puis
redéployez.
</details>

### 2 - Ne journaliser que les commandes

Le bandeau *Logging smartly* le rappelle : chaque log consomme de la place
dans Elasticsearch et ralentit un peu la gateway. Ne journalisez le détail
que des commandes de café, pas des consultations du catalogue ou de
l'historique. Le dashboard *API Traffic* doit continuer à compter toutes les
requêtes.

<details>
<summary>Indice : Condition de logging</summary>

Dans *Configure Reporting*, *Display conditions*, renseignez *Request phase
condition* :

```
{#request.method == 'POST'}
```

*Save*, puis redéployez. Dans *Logs*, les `GET` restent listés mais leur
détail n'a plus d'en-têtes.
</details>
