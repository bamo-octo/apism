# Raccourcis du TP « Sécuriser et Manager son API ».

.DEFAULT_GOAL := help
.PHONY: help install start stop clean build logs status ascenseur

help: ## Affiche cette aide
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances pour l'autocomplétion dans l'IDE
	cd apps/api && npm ci
	cd apps/catalogue && npm ci
	cd apps/web && npm ci

start: ## Démarre l'API, le catalogue, la SPA, Keycloak et Gravitee
	docker compose up -d --build
	@echo
	@echo "SPA MyBrew ......... http://localhost:4200"
	@echo "API MyBrew ......... http://localhost:3000"
	@echo "Keycloak ........... http://localhost:18080 (admin / admin)"
	@echo "Gateway Gravitee ... http://localhost:8082"
	@echo "Console Gravitee ... http://localhost:8084 (admin / admin)"
	@echo "Portail Gravitee ... http://localhost:4100"

stop: ## Arrête la stack
	docker compose stop

clean: ## Supprime conteneurs et volumes : on repart de zéro
	docker compose down -v

build: ## Reconstruit les images applicatives
	docker compose build api catalogue web

status: ## État des conteneurs
	docker compose ps -a

logs: ## Suit les logs de l'API, du catalogue, de la SPA, de Keycloak et de la gateway
	docker compose logs -f api catalogue web keycloak gateway

ascenseur: ## Lance l'interface de l'ascenseur
	docker compose run --rm ascenseur
