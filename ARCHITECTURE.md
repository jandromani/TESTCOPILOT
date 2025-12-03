# Architecture Documentation

Visión profunda de la arquitectura del sistema de orquestación de agentes.

## 📐 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   INPUT LAYER                                    │
│  PDF / JSON Specifications via GitHub, API, or Local File        │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│             ORCHESTRATION LAYER (Agent-0)                        │
│  • Parse input format                                            │
│  • Manage execution state                                        │
│  • Route to specialized agents                                   │
│  • Persist artifacts                                             │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│         PROCESSING LAYER (Agents 1-5, parallel)                  │
│                                                                   │
│  Agent-1 (Parser)        Agent-3 (DB)        Agent-5 (Frontend)  │
│  ├─ PDF parsing          ├─ SQL schema       ├─ React comps     │
│  ├─ JSON validation      ├─ Migrations       ├─ UI logic        │
│  └─ Spec extraction      └─ Relationships    └─ State mgmt      │
│                                                                   │
│  Agent-2 (Planner)       Agent-4 (Backend)                       │
│  ├─ Task decomposition   ├─ API endpoints                        │
│  ├─ Dependencies         ├─ Auth/validation                      │
│  └─ Prioritization       └─ Error handling                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│         VALIDATION LAYER (Agents 8-11)                           │
│  • Unit / Integration tests (Agent-8)                            │
│  • Code quality analysis (Agent-9)                               │
│  • Security scanning (Agent-11)                                  │
│  • Performance profiling (Agent-10)                              │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│         DEPLOYMENT LAYER (Agents 12-17)                          │
│  • Docker build (Agent-6)                                        │
│  • Push to registry (Agent-12)                                   │
│  • Kubernetes apply (Agent-12)                                   │
│  • Smoke tests (Agent-16)                                        │
│  • Monitoring setup (Agent-17)                                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                   OUTPUT LAYER                                   │
│  Deployed application on Kubernetes / Cloud                      │
│  + Monitoring, alerts, cost tracking                             │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Execution Flow

### Phase 1: Input Processing

```javascript
// src/runner.js → runFullPipeline()
1. Load input (JSON, PDF, or dummy specs)
2. Generate runId = run_<timestamp>
3. Initialize state: { runId, agents: {}, artifacts: [], status: 'started' }
4. Save to state/runner-state.json
```

### Phase 2: Agent Orchestration (Sequential)

```javascript
// Each agent executes in order, reading from previous output

Agent-0 (Initialize)
  ├─ Input: action='saveState'
  ├─ Process: Dispatch initial state
  └─ Output: { status: 'ok', path: null, content: { state } }

Agent-1 (Parse)
  ├─ Input: type='json|pdf', path
  ├─ Process: fs.read → parse → extract specs
  └─ Output: { status: 'ok', path: '/path', content: { title, characters, plot } }

Agent-2 (Plan)
  ├─ Input: specifications from A1, default_owner='A3'
  ├─ Process: Decompose into tasks, resolve dependencies
  └─ Output: { status: 'ok', path: '/state/tasks_*.json', content: { tasks: [...] } }

Agent-3 (DB)
  ├─ Input: data from A1, taskId, outputPath
  ├─ Process: generateDatabaseSchema() → enhance with LLM if requested
  └─ Output: { status: 'ok', path: '/state/schema_*.sql', content: SQL }

Agent-4 (API)
  ├─ Input: endpoints array, taskId, outputPath
  ├─ Process: generateAPI() → optionally enhance with LLM
  └─ Output: { status: 'ok', path: '/state/api_*.json', content: [...] }

Agent-5 (UI)
  ├─ Input: components array, taskId, outputPath
  ├─ Process: generateComponent() → optionally enhance with LLM
  └─ Output: { status: 'ok', path: '/state/components_*.json', content: [...] }

Phase-7 (LLM Summary)
  ├─ Model: selectBestModel('agent-1', 'analysis')
  ├─ Input: Aggregated results from A0-A5
  ├─ Process: callOpenRouter with free model
  └─ Output: LLM summary text saved to state.llmSummary
```

## 🧠 Agent Specializations

### Phase 1: Input & Analysis (Agents 0-2)

| Agent | Responsibility | Model | Input | Output |
|-------|-----------------|-------|-------|--------|
| A0 | Orchestration master | Grok | Action dispatch | State snapshot |
| A1 | Specification parser | Gemini | PDF/JSON | Structured specs |
| A2 | Task planner | Grok | Specs | Task list + deps |

### Phase 2: Code Generation (Agents 3-6)

| Agent | Responsibility | Model | Input | Output |
|-------|-----------------|-------|-------|--------|
| A3 | Database expert | Kat-Coder | Specs | SQL schema |
| A4 | Backend expert | Kat-Coder | Tasks | API endpoints |
| A5 | Frontend expert | Qwen | Tasks | UI components |
| A6 | Infrastructure expert | Kat-Coder | Specs | Dockerfile, K8s config |

### Phase 3: External Services (Agents 7, 10, 13, 15)

| Agent | Responsibility | Model | Input | Output |
|-------|-----------------|-------|-------|--------|
| A7 | External services | Grok | Specs | Third-party integrations |
| A10 | Performance analyzer | Gemini | Code artifacts | Performance profile |
| A13 | LLM integration | Grok | Specs | LLM provider config |
| A15 | Cost manager | Gemini | Infrastructure | Cost estimate |

### Phase 4: Validation & Testing (Agents 8, 9, 11, 14)

| Agent | Responsibility | Model | Input | Output |
|-------|-----------------|-------|-------|--------|
| A8 | Test generator | Gemini | Code | Test suites |
| A9 | Quality master | Grok | Code | Quality report |
| A11 | Security validator | Qwen | Code | Security audit |
| A14 | Licensing | Grok | Code | License compliance |

### Phase 5: Deployment & Monitoring (Agents 12, 16, 17)

| Agent | Responsibility | Model | Input | Output |
|-------|-----------------|-------|-------|--------|
| A12 | Deployer | Grok | Artifacts | Deployed app |
| A16 | Post-deployment | Grok | Deployed app | Smoke tests result |
| A17 | System monitor | Grok | Running app | Monitoring setup |

## 🤖 LLM Integration

### OpenRouter Configuration

```json
// models-config.json structure
{
  "provider": "openrouter",
  "free_models": [
    "x-ai/grok-4.1-fast:free",
    "google/gemini-2.0-flash-exp:free",
    "kwaipilot/kat-coder-pro:free",
    "qwen/qwen3-coder:free",
    "openrouter/bert-nebulon-alpha"
  ],
  "agent_models": {
    "agent-0": "x-ai/grok-4.1-fast:free",
    "agent-1": "google/gemini-2.0-flash-exp:free",
    ...
  },
  "max_retries_per_agent": 3,
  "token_limits": {
    "agent-0": { "max_tokens": 800 },
    "agent-1": { "max_tokens": 2000 },
    ...
  }
}
```

### Model Selection Strategy

```javascript
// shared/openrouter.js
function selectBestModel(agentName, taskType) {
  // 1. Check config for agent-specific model
  const model = config.agent_models[agentName];
  
  if (model) return model; // Found explicit mapping
  
  // 2. Fallback: heuristic based on task type
  if (taskType.includes('parse|analyze')) return GEMINI; // Analysis
  if (taskType.includes('code|api|sql')) return KAT_CODER; // Backend
  if (taskType.includes('component|ui')) return QWEN; // Frontend
  
  // 3. Ultimate fallback
  return config.free_models[0];
}
```

### LLM Call Flow

```javascript
// Each agent calls LLM if needed
async function execute(options) {
  if (options.llmEnhance || options.llmGenerate) {
    const model = selectBestModel('agent-n', 'task_type');
    const messages = [{ role: 'user', content: prompt }];
    
    // Resilient call with exponential backoff
    // Include `agentName` so the client can apply per-agent token limits and attribution
    const response = await callOpenRouter(model, messages, {
      temperature: 0.2,
      max_tokens: 2000,
      maxRetries: 3,
      agentName: 'agent-n'
    });
    
    return { status: 'ok', path: outPath, content: response };
  }
}
```

## 💾 State Persistence

### Directory Structure

```
state/
├── runner-state.json          # Main state document (runId, all results)
├── tasks_run_<timestamp>.json  # Task list from agent-2
├── schema_run_<timestamp>.sql  # DB schema from agent-3
├── api_run_<timestamp>.json    # API endpoints from agent-4
├── components_run_<timestamp>.json  # UI components from agent-5
└── [other_artifacts]
```

### State Schema

```javascript
{
  "runId": "run_1704067200000",
  "status": "completed",
  "createdAt": "2024-01-01T12:00:00Z",
  "completedAt": "2024-01-01T12:05:30Z",
  "agents": {
    "A0": { status: 'ok', path: null, content: {...} },
    "A1": { status: 'ok', path: '/state/spec_*.json', content: {...} },
    "A2": { status: 'ok', path: '/state/tasks_*.json', content: {...} },
    "A3": { status: 'ok', path: '/state/schema_*.sql', content: "CREATE TABLE..." },
    "A4": { status: 'ok', path: '/state/api_*.json', content: [...] },
    "A5": { status: 'ok', path: '/state/components_*.json', content: [...] }
  },
  "artifacts": [
    { "agent": "A1", "path": "/state/spec_run_1704067200000.json" },
    { "agent": "A2", "path": "/state/tasks_run_1704067200000.json" },
    ...
  ],
  "llmSummary": "This project is an e-commerce platform...",
  "error": null
}
```

## 🔌 Resilience Architecture

### Retry Logic

```javascript
// shared/retries.js
async function retry(fn, options = {}) {
  const { maxAttempts = 3, baseDelay = 500, onRetry } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      
      // Exponential backoff: 500ms, 1s, 2s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      onRetry?.(attempt, err);
      await sleep(delay);
    }
  }
}
```

### Error Handling

```javascript
// Each agent wraps in try-catch
async function execute(options) {
  try {
    // Main logic
    return { status: 'ok', path, content };
  } catch (err) {
    // Graceful fallback
    return { status: 'error', path: null, content: String(err) };
  }
}

// Runner checks status and continues
if (result.status === 'error') {
  console.warn(`❌ Agent failed; using fallback`);
  // Proceed with default/fallback data
}
```

## 🔐 Security Model

### Authentication & Authorization

- **No agent has file system access except through designated paths**
- **All LLM calls go through OpenRouter (signed with API key)**
- **Environment variables (.env) never exposed to agents**
- **Secrets stored in GitHub Secrets, not in code**

### Input Validation

```javascript
// Agent-1 validates input
function parseJSONSpec(filePath) {
  const schema = {
    title: string,
    description: string,
    characters: array,
    plot_points: array,
    // Extensible for future fields
  };
  
  const validated = validateAgainstSchema(data, schema);
  if (!validated) throw new Error('Invalid spec schema');
  return validated;
}
```

## 📊 Performance Model

### Execution Time Estimate

| Phase | Agent | Time | Notes |
|-------|-------|------|-------|
| Input | A0, A1 | 500ms | Parsing + validation |
| Planning | A2 | 200ms | Task decomposition (deterministic) |
| Generation | A3, A4, A5 (parallel) | 3-5s | LLM calls + file I/O |
| Validation | A8, A9, A11 | 5-10s | Testing + security scan |
| Deployment | A12, A16 | 30-60s | Docker build + K8s |
| **Total** | | **40-80s** | Varies by spec complexity |

### Scalability Considerations

- **Horizontal**: Multiple runners on different containers
- **Vertical**: Cache LLM responses, parallelize independent agents
- **Caching**: Store frequent queries (reduce API calls)

## 🔍 Monitoring & Observability

### Logging Strategy

```javascript
// Each agent logs: phase, agent name, status, time taken
console.log(`\n--- Phase N: [Agent] ---`);
console.log(`⚙️ Executing Agent-X...`);
console.log(`✅ Agent-X: status=${result.status}`);
console.log(`📍 State saved to ${filePath}`);
```

### Metrics to Collect

- Agent execution time
- LLM token usage per agent
- Error rates and retry counts
- Artifact sizes and types
- State persistence latency

## 🚀 Deployment Architecture

### Local Development

```
Developer Machine
├── Node.js 18+
├── .env with OPENROUTER_API_KEY
├── npm install
└── npm start
    → state/runner-state.json
```

### GitHub Actions

```
Push to main/develop
├── CI workflow (validate structure)
├── Push PDF → pdf-trigger workflow
└── Execute runner in GitHub Actions environment
    → Artifacts saved in workflow logs
```

### Kubernetes Production

```
Agent Runner Pod
├── Image: node:18-alpine
├── Env: OPENROUTER_API_KEY (secret)
├── Volume: /state (persistent volume)
├── Entrypoint: npm start /input/spec.json
└── Output: state/runner-state.json + artifacts
```

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production-Ready
