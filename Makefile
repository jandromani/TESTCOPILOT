# Makefile for local Docker builds and convenience
# Usage examples:
#   make build
#   make run OPENROUTER_API_KEY=sk-or-v1-... ENABLE_LLM=1
#   make shell

IMAGE_NAME := worldminiapp
SPEC := tests/fixtures/example-spec.json
STATE_DIR := $(shell pwd)/state

.PHONY: build run compose-up compose-down shell logs clean

build:
	docker build -t $(IMAGE_NAME) .

run:
	# Pass OPENROUTER_API_KEY and ENABLE_LLM via environment variables
	@echo "Running container (bind-mounting ./state)"
	docker run --rm \
	  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
	  -e ENABLE_LLM="${ENABLE_LM}" \
	  -v "$(STATE_DIR):/usr/src/app/state" \
	  $(IMAGE_NAME) node scripts/run-all-agents.js $(SPEC)

# If you prefer to use docker-compose (reads .env automatically)
compose-up:
	docker compose up --build

compose-down:
	docker compose down

shell:
	# Start an interactive shell in a disposable container
	docker run --rm -it \
	  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
	  -v "$(STATE_DIR):/usr/src/app/state" \
	  $(IMAGE_NAME) /bin/sh

logs:
	@echo "Log files in state/"
	ls -la state || true

clean:
	docker image rm -f $(IMAGE_NAME) || true
	rm -rf state/* || true

README:
	@echo "Makefile targets: build, run, compose-up, compose-down, shell, logs, clean"
	@echo "Run e.g.: make build && make run OPENROUTER_API_KEY=sk-or-v1-... ENABLE_LLM=1"
