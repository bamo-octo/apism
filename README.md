# MyBrew — TP « Sécuriser et Manager son API »

MyBrew gère la machine à café d'une entreprise : on consulte le catalogue des
boissons et on se fait couler un café.

Cette branche contient **l'état initial du TP** : l'application fonctionne,
mais rien n'est sécurisé. La SPA appelle l'API en direct et tout le monde peut
tout faire. Les étapes suivantes du TP ajoutent progressivement authentification,
autorisation et gestion d'API — voir [`TP/mybrew.md`](TP/mybrew.md).

## Démarrer

Prérequis : Docker Desktop (ou Docker Engine + Compose v2).

```bash
make demarrer   # ou : docker compose up -d --build
```

| Service | URL |
| --- | --- |
| SPA MyBrew | <http://localhost:4200> |
| API MyBrew | <http://localhost:3000> |

```bash
make aide       # liste tous les raccourcis
make etat       # etat des conteneurs
make nettoyer   # supprime tout, volumes compris
```

### Sans Docker

Pour itérer plus vite sur le code, l'API et la SPA se lancent aussi
directement avec Node (voir `.nvmrc`) :

```bash
cd apps/api && npm install && npm run start:dev   # API sur http://localhost:3000
cd apps/web && npm install && npm run start        # SPA sur http://localhost:4200
```

## Ce qu'il y a dans le dépôt

```
apps/api/   API NestJS : catalogue, préparations
apps/web/   SPA Angular (standalone, signals)
TP/         Instructions du TP pour les participants
```

Aucune base de données : le catalogue est en dur et l'historique des
préparations vit en mémoire dans l'API. Redémarrer l'API remet l'historique à
zéro.
