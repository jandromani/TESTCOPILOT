# GitHub Setup Guide

Para que el sistema de agentes funcione completamente en GitHub Actions, debes configurar los siguientes Secrets.

## 1. OPENROUTER_API_KEY

Tu clave de API gratuita de OpenRouter.

**Pasos**:
1. Ve a https://openrouter.ai/
2. Regístrate o inicia sesión
3. Navega a "Account" → "API Keys"
4. Copia tu clave (o crea una nueva)
5. En tu repositorio GitHub:
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `OPENROUTER_API_KEY`
   - Value: `tu_clave_aqui`
6. Click "Add secret"

## 2. GITHUB_TOKEN (Opcional, pero recomendado)

Para que los workflows puedan crear releases o comentarios en PRs.

GitHub lo crea automáticamente, pero puedes configurarlo explícitamente:
- Settings → Secrets and variables → Actions
- New repository secret
- Name: `GITHUB_TOKEN`
- Value: Generado por GitHub (usa el token del workflow si está disponible)

Nota: GitHub proporciona `secrets.GITHUB_TOKEN` automáticamente en workflows. Solo configúralo si necesitas permisos especiales.

## 3. Variables de Entorno Adicionales (Opcional)

Si deseas configurar otros parámetros:

### OPENROUTER_API_URL
- Default: `https://openrouter.ai/api/v1/chat/completions`
- Solo cambia si OpenRouter migra o tienes un proxy custom

### PDFPARSER_API_KEY
- Para servicios de parseo de PDF externos (futuro)
- No requerido actualmente (se usa `pdf-parse` local)

## 4. Verificar Setup

1. Push un cambio a `main`:
   ```bash
   git add .env.example
   git commit -m "chore: verify CI setup"
   git push origin main
   ```

2. Ve a Actions y verifica que el workflow `ci.yml` ejecute sin errores

3. Si agregaste un PDF:
   ```bash
   echo "# Sample Spec" > spec.md
   git add spec.md
   git commit -m "add: sample PDF for trigger test"
   git push origin main
   ```
   El workflow `pdf-trigger.yml` debe ejecutarse automáticamente

## 5. Troubleshooting

### ❌ "OPENROUTER_API_KEY not found"
- Verifica que el secret esté en Settings → Secrets
- Asegúrate de que el nombre es exacto: `OPENROUTER_API_KEY`
- Espera 5 minutos después de agregar el secret (caché de GitHub)

### ❌ "API error [403]: Unauthorized"
- Tu API key es inválida o expiró
- Genera una nueva en openrouter.ai/account/keys
- Actualiza el secret en GitHub

### ❌ "No free models available"
- OpenRouter requiere una cuenta verificada
- Si tienes account pero no hay modelos: contacta a soporte de OpenRouter

### ❌ Workflow no se ejecuta en PDF push
- `pdf-trigger.yml` solo se ejecuta si detecta cambios `**/*.pdf`
- Asegúrate de que el archivo tenga extensión `.pdf` (no `.md`)
- Verifica que la rama sea `main` o `develop` (configurable en workflow)

## 6. Local Testing Antes de Push

```bash
# Copiar env template
cp .env.example .env

# Agregar tu OPENROUTER_API_KEY a .env
# OPENROUTER_API_KEY=your-key-here

# Instalar dependencias
npm install

# Ejecutar pipeline local
npm start

# Revisar resultados en state/runner-state.json
cat state/runner-state.json
```

## 7. Roles y Permisos

Si ejecutas en una organización GitHub:

- **Organization Member**: Puede crear secrets en repos personales
- **Admin/Owner**: Necesario para crear secrets en repos organizacionales
- **Actions Permissions**: Verifica que la organización permite workflows

Settings → Actions → General → "Workflow permissions" → Selecciona "Read and write permissions"

## 8. Seguridad

✅ **Buenas prácticas**:
- Nunca hardcodees secrets en código
- Usa `.env.example` sin valores reales
- Gitignore `.env` local
- Rota keys regularmente
- Monitorea usage en openrouter.ai/account/billing

❌ **Evita**:
- Compartir secrets en Issues o PRs
- Usar la misma key en múltiples servicios
- Dejar keys en histórico de Git (usa `git filter-repo` si sucede)

---

Para más info: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
