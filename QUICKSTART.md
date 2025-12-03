# 🚀 Quick Start Guide

Comienza con el sistema de agentes en 5 minutos.

## Prerequisitos

- Node.js 18+ instalado
- `npm` en tu PATH
- (Opcional) Un editor de texto o VS Code

## Paso 1: Configuración Inicial (2 min)

```bash
# Navega al proyecto
cd worldminiapp/vscode

# Instala dependencias
npm install

# Copia el template de variables de entorno
cp .env.example .env
```

## Paso 2: Configura OpenRouter API Key (2 min)

OpenRouter proporciona modelos LLM **gratuitos**.

1. Ve a https://openrouter.ai/
2. Regístrate (es gratis)
3. Navega a "Account" → "API Keys" → "Create Key"
4. Copia la clave generada
5. Abre `.env` y reemplaza:
   ```
   OPENROUTER_API_KEY=your_key_here
   ```

## Paso 3: Valida tu Configuración (1 min)

```bash
npm run validate
```

Deberías ver un resumen como:

```
✅ Environment Setup
✅ Shared Utilities
✅ Models Configuration
✅ Agent Structure
✅ Runner Script
✅ Package Dependencies

Passed: 6/6
✅ All checks passed! You can run: npm start
```

## Paso 4: Ejecuta el Pipeline

### Opción A: Sin entrada (genera specs dummy)

```bash
npm start
```

### Opción B: Con archivo JSON de especificaciones

```bash
npm start ./path/to/spec.json
```

Ejemplo de `spec.json`:
```json
{
  "title": "Mi Proyecto",
  "description": "Un sistema de tareas",
  "characters": ["Alice", "Bob"],
  "plot_points": ["Inicio", "Conflicto", "Resolución"]
}
```

### Opción C: Con archivo PDF

```bash
npm start ./path/to/document.pdf
```

## Paso 5: Revisa los Resultados

Los artefactos se guardan en `state/runner-state.json`:

```bash
# Ver JSON completo
cat state/runner-state.json | jq .

# Ver solo status
cat state/runner-state.json | jq '.agents'

# Ver modelos utilizados
cat state/runner-state.json | jq '.llmSummary'
```

## 📋 Flujo Ejecutado

El `npm start` ejecuta estos agentes automáticamente:

| # | Agente | Modelo | Entrada | Salida |
|---|--------|--------|---------|--------|
| 1 | **A0** | Grok | Init | State saved |
| 2 | **A1** | Gemini | PDF/JSON | Specifications |
| 3 | **A2** | Grok | Specs | Task plan |
| 4 | **A3** | Kat-Coder | Specs | SQL schema |
| 5 | **A4** | Kat-Coder | Tasks | API endpoints |
| 6 | **A5** | Qwen | Tasks | UI components |
| 7 | **LLM** | Gemini | Summary | LLM response |

## 🆘 Troubleshooting

### Error: "OPENROUTER_API_KEY not set"
```
✅ Solución:
1. Abre .env
2. Verifica: OPENROUTER_API_KEY=tu_clave_aqui
3. Reemplaza "tu_clave_aqui" con tu key de openrouter.ai
4. Guarda el archivo
5. Ejecuta npm start de nuevo
```

### Error: "No free models available"
```
⚠️ Posibles causas:
1. API key inválida → Genera una nueva en openrouter.ai
2. Cuenta no verificada → OpenRouter requiere verificación
3. Cuota agotada → (Muy raro en free tier, contacta soporte)

✅ Solución:
1. Ve a https://openrouter.ai/account
2. Verifica que tu cuenta esté verificada
3. Genera una nueva API key
4. Actualiza .env con la nueva key
```

### Error: "Cannot find module 'pdf-parse'"
```
✅ Solución:
npm install pdf-parse --save
```

### Todo funciona pero no ve el output
```
✅ Solución:
Busca el archivo state/runner-state.json:
cat state/runner-state.json | jq '.' | head -50
```

## 🔥 Próximos Pasos

### 1. Integración con GitHub

Push a tu repositorio y GitHub ejecutará automáticamente:

```bash
git add .
git commit -m "init: configure agent orchestration with OpenRouter"
git push origin main
```

Los workflows se activarán en:
- **Cada push**: Validación de estructura (`.github/workflows/ci.yml`)
- **Push de PDF**: Ejecución automática del pipeline (`.github/workflows/pdf-trigger.yml`)

### 2. Agregar tu OPENROUTER_API_KEY a GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. New repository secret:
   - Name: `OPENROUTER_API_KEY`
   - Value: Tu key de openrouter.ai
4. Add secret

Esto permite que los workflows ejecuten con tu API key.

### 3. Agregar un PDF de Prueba

```bash
# Crear un PDF de prueba (o usar uno real)
echo "# Sample Book Specification\nChapter 1: Introduction\nCharacters: Alice, Bob" > spec.md

# Agregar y push
git add spec.md
git commit -m "add: sample spec for PDF trigger test"
git push origin main
```

El workflow `pdf-trigger.yml` detectará el `.pdf` y ejecutará automáticamente.

### 4. Explorar Agentes Individuales

```bash
# Ver descriptor de agent-1
cat custom-agents/agent-1/agent-1.agent.md

# Ver configuración de agent-3 (DB)
cat custom-agents/agent-3/agent-3-config.md

# Ver código de agent-5 (Frontend)
cat custom-agents/agent-5/agent-5-actions.js
```

### 5. Personalizar Modelos

Abre `models-config.json` y ajusta:

```json
{
  "agent_models": {
    "agent-1": "google/gemini-2.0-flash-exp:free",
    "agent-3": "x-ai/grok-4.1-fast:free",
    ...
  }
}
```

## 📚 Más Información

- **README.md**: Documentación completa
- **.github/SETUP.md**: Guía de GitHub Secrets
- **models-config.json**: Mapeo de modelos por agente
- **src/runner.js**: Orquestador principal

## 🎯 Demo Completo (5 minutos)

```bash
# 1. Instalar y validar
npm install && npm run validate

# 2. Crear spec de prueba
cat > test-spec.json <<EOF
{
  "title": "E-Commerce Platform",
  "description": "A simple online store",
  "characters": ["Customer", "Admin"],
  "plot_points": ["Browse", "Add to Cart", "Checkout", "Confirm"]
}
EOF

# 3. Ejecutar pipeline
npm start test-spec.json

# 4. Ver resultados
cat state/runner-state.json | jq '.agents'

# 5. Explorar artifacts
ls -la state/
```

## ✨ Características Principales

✅ **17 Agentes Especializados**: Orquestación, análisis, código, validación, deploy  
✅ **Modelos Gratuitos**: OpenRouter con 5 modelos free (Grok, Gemini, Kat-Coder, Qwen)  
✅ **Persistencia de Estado**: Cada ejecución guarda artefactos e histórico  
✅ **Resilencia**: Retry automático con exponential backoff  
✅ **Automatización GitHub**: CI/CD y trigger en PDF push  
✅ **Salidas Normalizadas**: Todos los agentes retornan `{status, path, content}`

## 🤝 Support

Si tienes problemas:

1. Revisa los logs: `cat state/runner-state.json | jq '.agents | .[] | select(.status=="error")'`
2. Valida config: `npm run validate`
3. Consulta README.md para detalles de cada agente
4. Contacta al equipo con logs relevantes

---

**¡Listo para comenzar?** ⚡

```bash
npm install && npm run validate && npm start
```

¡Felicidades! 🎉 Ya estás ejecutando un sistema de 17 agentes con LLM.
