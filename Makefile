# Raccourcis du TP « Securiser et Manager son API ».
# Tout passe par Docker Compose : aucun prerequis Node cote participant.

.DEFAULT_GOAL := aide
.PHONY: aide demarrer arreter nettoyer reconstruire journaux etat tester amorcer reamorcer jeton ouvrir

aide: ## Affiche cette aide
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}'

demarrer: ## Demarre toute la pile (Keycloak, Gravitee, API, SPA, sonde)
	docker compose up -d --build
	@echo
	@echo "SPA MyBrew ......... http://localhost:4200"
	@echo "Gateway Gravitee ... http://localhost:8082/mybrew"
	@echo "Console Gravitee ... http://localhost:8084  (admin / admin)"
	@echo "Portail Gravitee ... http://localhost:4100"
	@echo "Keycloak ........... http://localhost:8080  (admin / admin)"
	@echo
	@echo "L'amorcage de Gravitee prend une minute ; suivez-le avec : make journaux"

arreter: ## Arrete la pile en gardant les donnees
	docker compose stop

nettoyer: ## Supprime conteneurs et volumes : on repart de zero
	docker compose down -v

reconstruire: ## Reconstruit les images applicatives
	docker compose build api web sonde

etat: ## Etat des conteneurs
	docker compose ps -a

journaux: ## Suit les journaux de l'amorcage, de l'API et de la sonde
	docker compose logs -f amorcage api sonde

amorcer: ## Rejoue l'amorcage de Gravitee (sans rien supprimer)
	docker compose run --rm amorcage

reamorcer: ## Supprime puis recree l'API, ses plans et ses souscriptions
	docker compose run --rm -e REAMORCER=true amorcage

tester: ## Verifie de bout en bout qui a le droit de faire quoi
	./outils/tester-securite.sh

jeton: ## Affiche un jeton d'acces (make jeton UTILISATEUR=david)
	@./outils/jeton.sh $(or $(UTILISATEUR),alice)
