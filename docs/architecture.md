# Architecture de l'état final

Ce document explique **pourquoi** la pile est construite ainsi, et pointe les
endroits où l'on se casse les dents quand on la reproduit. Il sert à la fois de
support de formation et de note de passation pour le déploiement.

## Le chemin d'une requête

```
                        ┌──────────────────────────────┐
                        │  Keycloak 26 (realm mybrew)  │
                        │  :8080                       │
                        └───┬──────────────┬───────────┘
             1. Code+PKCE   │              │  3. JWKS / introspection
                            │              │
┌───────────────┐   2. Bearer  ┌───────────▼─────────────┐   4. proxy
│  SPA Angular  ├─────────────►│  Gateway Gravitee :8082 ├──────────────┐
│  nginx :4200  │              │  /mybrew                │              │
└───────────────┘              └───────────▲─────────────┘              │
                                           │                   ┌────────▼────────┐
┌───────────────┐  Client Credentials      │                   │   API NestJS    │
│ Sonde machine ├──────────────────────────┘                   │  :3000 (privée) │
└───────────────┘                                              └─────────────────┘
```

1. Le navigateur obtient un jeton auprès de Keycloak (Authorization Code + PKCE).
2. La SPA appelle **uniquement** la gateway, jamais l'API.
3. La gateway vérifie le jeton : signature via JWKS pour les utilisateurs,
   introspection pour la sonde.
4. La gateway relaie vers l'API, qui revérifie tout de son côté.

L'API n'a aucun port publié dans `docker-compose.yml` (les lignes `ports` sont
commentées, à décommenter pour la déboguer en direct).

## Deux barrières, pas une

La gateway et l'API vérifient chacune le jeton, et ce n'est pas redondant :

| | Gateway Gravitee | API NestJS |
| --- | --- | --- |
| Signature du jeton | oui (JWKS ou introspection) | oui (JWKS) |
| Émetteur (`iss`) | non | oui |
| Audience (`aud`) | non | oui (`mybrew-api`) |
| Souscription à un plan | oui | non |
| Rôles métier | non | oui |
| Scopes | oui sur le plan sonde | oui, route par route |
| Débit et quotas | oui | non |

La gateway protège **le service** (qui a le droit d'appeler, combien de fois).
L'API protège **les données** (qui a le droit de faire quoi). Si la gateway
tombait ou si quelqu'un joignait l'API directement, l'API refuserait toujours un
jeton invalide : c'est le principe de défense en profondeur.

## Points techniques qui méritent une explication

### L'émetteur et l'URL des clés sont deux réglages distincts

Le navigateur voit Keycloak sur `http://localhost:8080`, l'API le voit sur
`http://keycloak:8080` (réseau Docker). Or le jeton contient
`iss: http://localhost:8080/realms/mybrew` — c'est cette valeur que l'API doit
attendre, alors qu'elle télécharge les clés publiques par le réseau interne.

D'où deux variables séparées dans `apps/api/src/configuration/configuration.ts` :

```
JWT_EMETTEUR  = http://localhost:8080/realms/mybrew      (ce qu'on vérifie)
JWT_URL_JWKS  = http://keycloak:8080/realms/.../certs    (où l'on télécharge)
```

`KC_HOSTNAME: http://localhost:8080` force Keycloak à annoncer et à estampiller
cet émetteur, quel que soit le nom d'hôte utilisé pour l'appeler. Sans ça, un
jeton obtenu depuis le navigateur serait refusé par l'API — c'est l'erreur la
plus fréquente sur ce genre de montage.

### Keycloak 26 exige que l'introspecteur soit dans l'audience

Depuis Keycloak 26, `POST /protocol/openid-connect/token/introspect` renvoie
`{"active": false}` si le client qui introspecte n'est pas dans le `aud` du
jeton — sans autre explication côté appelant. Le journal Keycloak est plus
bavard :

```
INTROSPECT_TOKEN_ERROR ... reason="Client 'gravitee-introspection' is not in the token audience"
```

Le realm contient donc un client scope `audience-gravitee` (mapper
`oidc-audience-mapper`) attaché par défaut à `mybrew-spa` et `mybrew-sonde`.

### Deux plans se disputent l'en-tête Authorization

Le plan JWT et le plan OAuth2 savent tous les deux traiter un
`Authorization: Bearer`. Gravitee prend le premier plan capable de traiter la
requête : celui-ci échoue (« aucune souscription pour ce client ») et la chaîne
s'arrête là, sans essayer le suivant.

La solution est une **règle de sélection** (`selectionRule`) sur chaque plan :

```
Utilisateurs MyBrew : {#request.path.endsWith('/machine/telemetrie') == false}
Sonde machine       : {#request.path.endsWith('/machine/telemetrie')}
```

Écrire `{!#request.path.endsWith(...)}` **ne marche pas** : le moteur
d'expressions ne reconnaît pas le délimiteur et renvoie la chaîne telle quelle,
ce qui plante le déploiement avec `Invalid boolean value`. D'où la comparaison
explicite à `false`.

### JWKS ou introspection ?

| | JWKS (plan utilisateurs) | Introspection (plan sonde) |
| --- | --- | --- |
| Coût | zéro appel réseau par requête | un appel à Keycloak par requête |
| Révocation | le jeton reste valide jusqu'à son `exp` | prise en compte immédiatement |
| Panne de Keycloak | la gateway continue de valider | tout est refusé |

Les deux sont dans le TP pour que le compromis soit visible. Le durcissement
naturel est de réduire la durée de vie des jetons (ici 300 s) plutôt que de
passer tout le trafic par l'introspection.

### Pas de plan « keyless »

Il n'y en a volontairement aucun dans l'état final : un appel sans jeton reçoit
un **401** franc. Avec un plan keyless, même restreint par `resource-filtering`,
les appels non authentifiés recevraient un 403 sur les routes protégées, ce qui
brouille le message. L'étape 6 du TP, elle, utilise un plan keyless : à ce
moment-là la gateway ne fait que du transport.

### Le rate limiting est indexé sur l'utilisateur

```
key: {#context.attributes['user']}
```

Cet attribut est alimenté par le `userClaim` du plan JWT (`preferred_username`).
Sans lui, la clé serait la souscription — donc l'application entière — et
`bruno` consommerait le quota de tout le monde.

Les compteurs sont stockés dans MongoDB (`gravitee_ratelimit_mongodb_uri`) et non
en mémoire : ils resteraient cohérents avec plusieurs instances de gateway.

### La SPA n'est pas une frontière de sécurité

`apps/web/src/app/noyau/session.service.ts` décode le jeton **sans vérifier sa
signature**, uniquement pour afficher le nom et masquer les boutons inutiles. Un
participant qui bidouille le jeton dans le navigateur verra apparaître des
boutons, et recevra un 403 en cliquant. C'est exactement le message à faire
passer.

### La configuration de la SPA est lue à l'exécution

`apps/web/src/main.ts` charge `configuration.json` **avant** `bootstrapApplication`.
Ce fichier est écrit au démarrage du conteneur par
`apps/web/docker/ecrire-configuration.sh` (`envsubst`). Conséquence utile pour le
TP : la même image sert à toutes les étapes, il suffit de changer les variables
d'environnement — URL de l'API, activation de l'authentification, scopes demandés.

### Les en-têtes de compteurs doivent être exposés

Le navigateur cache les en-têtes de réponse non standard. Sans
`exposeHeaders` dans la configuration CORS du listener, la SPA ne verrait ni
`X-Rate-Limit-Remaining` ni `Retry-After`. Le prévol `OPTIONS` est traité par la
gateway avec `runPolicies: false`, sinon il serait rejeté en 401 (un prévol ne
porte jamais de jeton).

## L'amorçage de Gravitee

`infra/gravitee/amorcage/amorcer.mjs` rejoue par l'API de management ce qu'on
ferait à la main dans la console. Trois choses à savoir si vous le reprenez :

1. **L'authentification Basic ne suffit pas.** Il faut d'abord échanger les
   identifiants contre un jeton :
   `POST /management/v1/organizations/DEFAULT/user/login` avec `Basic admin:admin`,
   puis `Authorization: Bearer <jeton>` sur tous les appels suivants.
2. **`POST /apis` ignore le champ `resources`.** La ressource d'introspection
   doit être ajoutée par un `PUT /apis/{id}` juste après la création, sinon le
   plan OAuth2 est écarté silencieusement au déploiement.
3. **Les plans exigent `definitionVersion: "V4"`** dans le corps, sans quoi
   l'API de management répond `Validation error / must not be null`.

Le script est idempotent : il ne fait rien si l'API existe déjà. `REAMORCER=true`
ferme les plans, supprime l'API et les applications, puis recrée tout.

Il écrit un récapitulatif dans `infra/gravitee/amorcage/sortie/recapitulatif.json`
(identifiants de l'API, des plans, des souscriptions, clé d'API générée).

## Vers un déploiement réel

Ce qui est volontairement simplifié ici, et ce qu'il faudrait reprendre :

| Sujet | État du TP | À faire pour un vrai déploiement |
| --- | --- | --- |
| Keycloak | `start-dev`, pas de volume, realm réimporté | `start`, base de données externe, realm géré en IaC |
| Secrets | en clair dans `.env`, versionné | gestionnaire de secrets, rotation des secrets clients |
| TLS | tout en HTTP | HTTPS partout, `KC_HOSTNAME` en https, cookies `Secure` |
| Flow `password` | activé pour les tests en ligne de commande | à désactiver |
| Elasticsearch | mono-nœud, sécurité désactivée | cluster, authentification, rétention des index |
| MongoDB | un nœud, sans authentification | replica set, authentification, sauvegardes |
| État applicatif | en mémoire dans l'API | base de données, l'API doit devenir sans état |
| Amorçage Gravitee | script au démarrage | export/import de définition d'API versionnée, ou opérateur Kubernetes |
| Journalisation gateway | corps des requêtes non journalisé, en-têtes oui | vérifier qu'aucune donnée personnelle ne part dans les logs |

Les images sont épinglées dans `.env` (`VERSION_APIM`, `VERSION_KEYCLOAK`,
`VERSION_MONGO`, `VERSION_ELASTIC`) : tout le monde travaille sur les mêmes, et
une montée de version est un changement explicite.
