# Raccourcis du TP « Sécuriser et Manager son API ».

.DEFAULT_GOAL := help
.PHONY: help install start stop clean build logs status

help: ## Affiche cette aide
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances pour l'autocomplétion dans l'IDE
	cd apps/api && npm ci
	cd apps/web && npm ci

start: ## Démarre l'API et la SPA
	docker compose up -d --build
	@echo
	@echo "SPA MyBrew .... http://localhost:4200"
	@echo "API MyBrew .... http://localhost:3000"

stop: ## Arrête la stack
	docker compose stop

clean: ## Supprime conteneurs et volumes : on repart de zéro
	docker compose down -v

build: ## Reconstruit les images applicatives
	docker compose build api web

status: ## État des conteneurs
	docker compose ps -a

logs: ## Suit les logs de l'API et de la SPA
	docker compose logs -f api web
