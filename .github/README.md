# GitHub Configuration Files

Documentación y configuración para GitHub Actions y GitHub Secrets.

## 📄 Archivos

### workflows/

- **`pdf-trigger.yml`**: Workflow que se ejecuta automáticamente cuando se detecta un PDF en un push
  - Trigger: `paths: ['**/*.pdf']`
  - Acción: Ejecuta `node src/runner.js` con el PDF
  - Requisito: `OPENROUTER_API_KEY` en GitHub Secrets

- **`ci.yml`**: Workflow de integración continua
  - Trigger: Cada push o PR en main/develop
  - Validaciones:
    - JSON config validity
    - Agent folder structure (18 agentes)
    - .env.example completeness
    - JS syntax validation
  - No requiere secrets (solo validación estática)

### SETUP.md

Guía paso a paso para configurar GitHub Secrets:
- Cómo obtener `OPENROUTER_API_KEY` de openrouter.ai
- Cómo agregar secrets en GitHub
- Troubleshooting común
- Buenas prácticas de seguridad

### README.md

(En el directorio raíz) Documentación completa del sistema:
- Arquitectura de 17 agentes
- Mapeo de modelos LLM por agente
- Stack tecnológico
- Flujo de ejecución
- Guía de integración

## 🔧 Configuración Recomendada

### 1. Agregar OPENROUTER_API_KEY a GitHub Secrets

```bash
# En GitHub.com:
Settings → Secrets and variables → Actions
New repository secret:
  Name: OPENROUTER_API_KEY
  Value: your-key-from-openrouter.ai
```

### 2. (Opcional) Configurar Branch Protection

Si usas `main` como rama protegida:

```
Settings → Branches → Branch protection rules → main
✅ Require status checks to pass before merging
  → Select "CI" workflow
✅ Dismiss stale pull request approvals when new commits are pushed
```

### 3. (Opcional) Permisos de Workflow

```
Settings → Actions → General
✅ Allow all actions and reusable workflows
  (O seleccionar solo los workflows que usas)
Workflow permissions: Read and write permissions
```

## 📊 Workflows en Acción

### Ejecutar CI Manualmente

```bash
git add .
git commit -m "chore: trigger CI validation"
git push origin main

# Ve a Actions tab en GitHub para ver el progreso
```

### Ejecutar PDF Trigger Manualmente

```bash
# Agregar un PDF
curl -o my-spec.pdf https://example.com/spec.pdf
git add my-spec.pdf
git commit -m "docs: add specification PDF"
git push origin main

# Verifica que pdf-trigger.yml ejecute en Actions
```

## 🔐 Secrets Recomendados

| Secret | Valor | Requerido | Fuente |
|--------|-------|-----------|--------|
| `OPENROUTER_API_KEY` | Tu API key | ✅ | https://openrouter.ai/account/keys |
| `GITHUB_TOKEN` | (Auto) | ✅ | Generado por GitHub automáticamente |
| `SLACK_WEBHOOK` | (Opcional) | ❌ | Tu workspace Slack |

## 🆘 Troubleshooting Workflows

### ❌ "OPENROUTER_API_KEY not found in workflow"

**Solución**:
1. Verifica que el secret esté en Settings → Secrets
2. Nombre exacto: `OPENROUTER_API_KEY` (sensible a mayúsculas)
3. Espera 5 minutos después de agregar (caché de GitHub)
4. Haz un push nuevo para triggear workflow

### ❌ "pdf-trigger.yml no se ejecuta"

**Solución**:
1. Verifica que el archivo sea `.pdf` (extensión exacta)
2. Verifica que sea en rama `main` o `develop` (configurable en workflow)
3. En Actions → Workflows, habilita el workflow si está deshabilitado

### ❌ "Syntax errors in workflow file"

**Solución**:
1. Valida YAML: https://www.yamllint.com/
2. Revisa la sintaxis en el workflow
3. Verifica indentación (YAML es sensible a espacios)

### ❌ "API error [401]: Unauthorized"

**Solución**:
1. Tu API key es inválida
2. Genera una nueva en openrouter.ai/account/keys
3. Actualiza el secret en GitHub

## 📈 Monitoreo

Ver estado de workflows:

```bash
# En GitHub.com:
Actions → Workflows → [Workflow name]

# O en línea de comandos (con gh CLI):
gh run list --workflow=pdf-trigger.yml
gh run view <run-id> --log
```

## 🔗 Referencias

- GitHub Actions Docs: https://docs.github.com/en/actions
- YAML Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Secrets: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
- OpenRouter: https://openrouter.ai/

---

**Última actualización**: 2024
**Versión**: 1.0
