# Raccourcis du TP « Securiser et Manager son API ».

.DEFAULT_GOAL := aide
.PHONY: aide demarrer arreter nettoyer reconstruire journaux etat

aide: ## Affiche cette aide
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}'

demarrer: ## Demarre l'API et la SPA
	docker compose up -d --build
	@echo
	@echo "SPA MyBrew .... http://localhost:4200"
	@echo "API MyBrew .... http://localhost:3000"

arreter: ## Arrete la pile
	docker compose stop

nettoyer: ## Supprime conteneurs et volumes : on repart de zero
	docker compose down -v

reconstruire: ## Reconstruit les images applicatives
	docker compose build api web

etat: ## Etat des conteneurs
	docker compose ps -a

journaux: ## Suit les journaux de l'API et de la SPA
	docker compose logs -f api web
