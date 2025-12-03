# WorldMiniApp: Agent Orchestration System

Sistema completo de orquestación de 17 agentes especializados para procesar especificaciones de contenido (PDF/JSON) → generar código, esquemas de BD, componentes UI → validar salida → desplegar a producción.

## 🏗️ Arquitectura

### Agentes (17 Total)

**Fase 1: Entrada & Análisis**
- **Agent-0** (Orchestrator Master): Orquesta flujo, maneja estado, despacha tareas
- **Agent-1** (Specification Analyst): Parsea PDF/JSON, extrae especificaciones
- **Agent-2** (Task Planner): Descompone especificaciones en plan de tareas

**Fase 2: Generación de Código**
- **Agent-3** (DB Expert): Genera esquemas SQL, migraciones
- **Agent-4** (Backend Expert): Genera endpoints API (Express.js)
- **Agent-5** (Frontend Expert): Genera componentes UI (React)
- **Agent-6** (Infrastructure Expert): Genera Dockerfiles, configs Kubernetes

**Fase 3: Servicios Externos**
- **Agent-7** (External Services): Integración con APIs de terceros
- **Agent-10** (Performance Analyzer): Monitoreo y análisis de rendimiento
- **Agent-13** (LLM Integration): Coordinación con LLM providers
- **Agent-15** (Cost Manager): Análisis de costos de infraestructura

**Fase 4: Validación & Testing**
- **Agent-8** (Test Generator): Crea suites de tests automatizados
- **Agent-9** (Quality Master): Ejecuta validaciones de calidad, análisis estático
- **Agent-11** (Security Validator): Auditoría de seguridad (OWASP ZAP)
- **Agent-14** (Licensing): Verifica licencias y compliance

**Fase 5: Orquestación Final**
- **Agent-12** (Deployer): Ejecuta despliegue a K8s, Docker registries
- **Agent-16** (Post-Deployment): Validación post-deploy, smoke tests
- **Agent-17** (System Monitor): Monitoreo continuo y alertas

## 🤖 Modelos LLM (OpenRouter - Free Tier)

Configuración en `models-config.json` con 5 modelos gratuitos:

| Modelo | Agentes | Caso de Uso |
|--------|---------|-----------|
| **x-ai/grok-4.1-fast:free** | A0, A2, A7, A9, A12, A14, A16, A17 | Orquestación, coordinación |
| **google/gemini-2.0-flash-exp:free** | A1, A8, A10, A13, A15 | Análisis, parsing, validación |
| **kwaipilot/kat-coder-pro:free** | A3, A4, A6 | Generación backend/DB/código |
| **qwen/qwen3-coder:free** | A5, A11 | Componentes UI, seguridad |
| **openrouter/bert-nebulon-alpha** | Fallback | Modelo de resiliencia |

**Nota**: Todos los modelos son del plan gratuito de OpenRouter. No se requiere tarjeta de crédito. Solo necesitas `OPENROUTER_API_KEY`.

## 📦 Estructura de Carpetas

```
├── custom-agents/
│   ├── agent-{0..17}/
│   │   ├── agent-{n}.agent.md        # Descriptor: rol, responsabilidades, handoffs
│   │   ├── agent-{n}-config.md       # Configuración YAML
│   │   └── agent-{n}-actions.js      # Implementación con execute()
│   └── agent-template/               # Plantilla para nuevos agentes
├── shared/
│   ├── openrouter.js                 # Cliente LLM con retry resilience
│   ├── retries.js                    # Exponential backoff retry helper
│   ├── utils.js                      # Utilidades generales
│   ├── common-tools.json             # Definición de herramientas
│   ├── shared-config.json            # Config global
│   ├── shared-logging.json           # Logging config
│   └── shared-utils.py               # Utilidades Python (para futuros agentes)
├── src/
│   └── runner.js                     # Orquestador principal con persistencia de estado
├── .github/workflows/
│   ├── pdf-trigger.yml               # Trigger automático en push de PDFs
│   └── ci.yml                        # CI/CD con validaciones de estructura
├── state/                            # Directorio de persistencia (generado en runtime)
├── models-config.json                # Mapeo de modelos por agente + LLM config
├── .env.example                      # Template de variables de entorno
├── package.json                      # Dependencias Node.js
└── README.md                         # Este archivo
```

## 🚀 Inicio Rápido

### 1. Instalación

```bash
# Clonar o descargar
cd worldminiapp/vscode

# Instalar dependencias
npm install

# Copiar env template
cp .env.example .env
```

### 2. Configurar OpenRouter API Key

```bash
# En .env
OPENROUTER_API_KEY=your-free-key-here
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
```

Obtén tu free API key en: https://openrouter.ai/

### 3. Ejecutar Pipeline

```bash
# Con JSON de especificaciones
npm start path/to/spec.json

# Con PDF
npm start path/to/doc.pdf

# Sin entrada (genera dummy specs)
npm start
```

### 4. Revisar Resultados

Los artefactos se guardan en `state/runner-state.json`:
- Salida de cada agente (Agent-0 → Agent-5)
- Modelos LLM utilizados
- Rutas de artifacts (SQL, JSON, componentes)
- Timestamps y status

## 📋 Flujo de Ejecución

```
┌─────────────────────────────────────────────────────┐
│ PDF/JSON Input                                      │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────▼────────────┐
      │ Agent-0: Initialize     │ (Orchestrator)
      │ Manage state, dispatch  │
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │ Agent-1: Parse Input    │ (Gemini Flash)
      │ Extract specs from PDF  │
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │ Agent-2: Plan Tasks     │ (Grok)
      │ Decompose into tasks    │
      └────────────┬────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
  ┌──▼──┐      ┌──▼──┐      ┌──▼──┐
  │ A3  │      │ A4  │      │ A5  │  (Parallel generation)
  │ SQL │      │ API │      │ UI  │
  └──┬──┘      └──┬──┘      └──┬──┘
     │             │             │
     └─────────────┼─────────────┘
                   │
      ┌────────────▼────────────┐
      │ Agent-8/9/11: Validate  │ (Testing & Security)
      │ Run tests, security scan│
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │ Agent-12: Deploy        │ (Deployer)
      │ Push to K8s/Docker Hub  │
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │ Agent-16/17: Monitor    │ (Post-Deploy)
      │ Verify & alert          │
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │ ✅ Output artifacts     │
      │ state/runner-state.json │
      └────────────────────────┘
```

## 🔧 Características Principales

### ✅ Persistencia de Estado
- Cada ejecución genera un `runId`
- Los artefactos se guardan en `state/` con histórico
- State includes: agentes ejecutados, modelos usados, rutas de output, timestamps

### ✅ Resilencia con Retries
- Exponential backoff: 3 intentos por defecto
- Base delay: 1000ms (configurable)
- Integrado en `shared/openrouter.js` + `shared/retries.js`

### ✅ Salidas Normalizadas
- Cada agente retorna: `{ status, path, content }`
- Status: 'ok' | 'error'
- Path: ruta del archivo generado (o null)
- Content: JSON con resultado o error

### ✅ Automatización GitHub
- **pdf-trigger.yml**: Ejecuta pipeline en cada push de PDF
- **ci.yml**: Valida estructura del repo, JSON configs, JS syntax

### ✅ Modelos Dinámicos por Agente
- Función `selectBestModel(agentName, taskType)` en `shared/openrouter.js`
- Lee automáticamente de `models-config.json`
- Fallback a herística si agente no está mapeado

## 📝 Integración de Agentes

Cada agente incluye método `execute(options)`:

```javascript
// agent-n-actions.js
async function execute(options = {}) {
  try {
    const model = selectBestModel('agent-n', 'task_type');
    // Pass the agent name so shared/openrouter can enforce per-agent token limits
    const result = await callOpenRouter(model, messages, { agentName: 'agent-n' });
    return { status: 'ok', path: outputPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}
```

## 🧪 Testing

```bash
# Instalar Jest (opcional)
npm install --save-dev jest

# Ejecutar tests
npm test
```

Tests viven en `tests/` con fixtures en `tests/fixtures/`.

## 🔐 Seguridad

- `OPENROUTER_API_KEY` nunca se hardcodea; usar `.env` (gitignore)
- En GitHub Actions: agregar a Secrets
- Agent-11 ejecuta auditoría de seguridad (OWASP ZAP)
- Agent-14 verifica compliance de licencias

## 📊 Monitoreo

- Agent-10: Análisis de performance
- Agent-15: Estimación de costos
- Agent-17: Monitoreo continuo post-deploy

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js 18+
- **LLM Provider**: OpenRouter (free tier)
- **PDF Parsing**: pdf-parse (opcional)
- **HTTP**: node-fetch
- **CI/CD**: GitHub Actions
- **Deployment**: Docker + Kubernetes (agentes 6, 12)

## 📚 Documentación por Agente

Cada agente tiene:
- `agent-n.agent.md` — Descriptor de rol y responsabilidades
- `agent-n-config.md` — Configuración técnica
- `agent-n-actions.js` — Implementación ejecutable

Véase `custom-agents/agent-*/` para detalles específicos.

## 🤝 Contribuciones

Para agregar un nuevo agente:
1. Copiar `agent-template/` a `agent-{n}/`
2. Actualizar descriptores y configuración
3. Implementar `execute()` en `-actions.js`
4. Añadir mapeo en `models-config.json` si usa LLM
5. Actualizar flujo en `src/runner.js` si es crítico para el pipeline

## 📄 Licencia

[Tu licencia aquí]

## 🔗 Enlaces

- **OpenRouter**: https://openrouter.ai/
- **PDF-Parse**: https://www.npmjs.com/package/pdf-parse
- **Kubernetes**: https://kubernetes.io/
- **GitHub Actions**: https://docs.github.com/en/actions

---

**Última actualización**: 2024
**Estado**: Production-Ready (core agents A0-A5)

