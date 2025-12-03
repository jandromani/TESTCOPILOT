<!--
Guidance for AI coding agents working in this repository.
This file is intentionally concise and focuses on repository-specific discovery heuristics
and decision points. Update when the project adds real source, build, or CI files.
-->
# Copilot / AI Agent Instructions

Quick goals
- Rapidly discover the project's architecture and boundaries.
- Identify the canonical build/test/debug workflow.
- Follow repository-specific conventions when changing code.

How to start (first 60–120s)
- Look for these files in the repo root, in this order: `README.md`, `package.json`,
  `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Dockerfile`, `docker-compose.yml`,
  `.vscode/launch.json`, `.github/workflows/`, `Makefile`, `tests/`, `src/` or `cmd/`.
- If none of the above exist (empty repo), create minimal artifacts and ask the maintainer
  what language/framework to scaffold. Do not guess the runtime.

Big-picture discovery checklist (what to gather and why)
- Entry points: find top-level executables or packages (`package.json#main`, `src/main.*`, `cmd/`).
- Service boundaries: detect folders named `api`, `services`, `worker`, `frontend`, `backend`.
- Data flows: look for `migrations/`, `models/`, `schemas/`, or `proto/` files to understand persisted models.
- Integrations: locate `Dockerfile`, `docker-compose.yml`, `.env*.example`, `terraform/`, `k8s/`.
  These indicate external runtime, infra, or third-party services.

Project-specific workflows (how to run/build/test)
- If `package.json` exists: prefer `npm ci` then `npm test` or `npm run build`.
- If `pyproject.toml` or `requirements.txt` exists: use venv, `pip install -r requirements.txt` or `pip install .` and run `pytest`.
- If `Makefile` exists: read `Makefile` and prefer `make test` / `make build` targets.
- If `docker-compose.yml` exists: prefer local dev with `docker compose up --build` when services are tightly coupled.

Conventions and patterns to preserve
- Keep public APIs stable: prefer adding non-breaking changes unless an associated API-update PR is included.
- Tests live in `tests/` or alongside modules in `*_test.py`, `__tests__`, or `*.spec.ts` files — run only the tests affected by your change when possible.
- Follow repo lint/format rules: if a config file exists for `eslint`, `prettier`, `ruff`, `black`, or `gofmt`, run the formatter before opening PRs.

Code-change guidance (practical rules for the agent)
- Small, focused commits: change a single responsibility per commit and include tests when modifying behavior.
- Update docs: if you change public shapes (APIs, CLI flags, DB migrations), add or update brief notes in `README.md` or `docs/`.
- If you add scripts to `package.json` or CI workflows, follow existing naming patterns (e.g., `build`, `test`, `lint`).

Merging with an existing `.github/copilot-instructions.md`
- Preserve any project-specific examples or commands already present.
- Add missing discovery heuristics from this file under a new subsection `Agent: additions by Copilot`.
- If you detect conflicting guidance (different test commands), prefer what `README.md` or CI workflow uses.

When you are blocked or unsure
- If runtime/language cannot be identified from files, ask the maintainer: what language/runtime should I target?
- If build or tests fail due to missing secrets or external services, request an integration stub or a test double.

Examples and placeholders
- Example: "If you find `package.json` with a `workspaces` key, treat the repo as a monorepo; run `npm -w <pkg> run test` for package-scoped tests."
- Example: "If a `docker-compose.yml` references `postgres` and `.env.example` has `DATABASE_URL`, assume an external DB is required for full integration tests."

What I changed here
- This repository had no discoverable source files when this instruction was added — this is a starter guidance file.

Next step for maintainers
- Paste or point the agent to `README.md` or any language/runtime notes. I will update this file with project-specific commands and examples.

---
Please review and tell me which languages, build systems, or files I should prioritize for deeper, repo-specific instructions.
