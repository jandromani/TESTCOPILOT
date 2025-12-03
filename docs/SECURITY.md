# Secrets & Security Guide

This document explains how to manage secrets for the WorldMiniApp agents project.

## Key points

- Never commit secrets to source control. `.env` files are local only and must be added to `.gitignore`.
- Use a secrets manager for production: GitHub Secrets, AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, etc.
- Rotate API keys immediately if accidentally exposed.

## Quick actions

1. Add `.env` to `.gitignore` (done).
2. Replace exposed keys in `.env` with placeholders.
3. Rotate the key at the provider (OpenRouter) immediately.
4. If key was pushed to GitHub, revoke it and rotate; consider using `git filter-repo` to remove it from history.

## Local development

- Create `.env` locally from `.env.example` and never push it.
- Example `.env`:

```
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxx
REDIS_URL=redis://localhost:6379
ENABLE_LLM=0
```

## CI / Production

- Store secrets in GitHub Actions `Settings → Secrets` and reference as environment variables in workflows.
- For Kubernetes, use secrets in the cluster and mount as environment variables or files.

## Audit & Scanning

- Use tools such as `truffleHog`, `git-secrets`, or `detect-secrets` to scan repo history.
- Add a pre-commit hook to block accidental commits with API keys.

## Contact

If you suspect a secret was leaked, rotate the key immediately and contact the platform support.
