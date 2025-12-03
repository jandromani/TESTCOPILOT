# Auditoría y Revisión de Agentes — Resumen y Acciones

Fecha: 2025-12-02

Este documento resume la revisión de los agentes (A0–A17), indica el estado actual, problemas detectados y acciones recomendadas. También incluye pasos para conectar OpenRouter como proveedor LLM central.

## Resumen rápido
- Todos los agentes tienen descriptores (`.agent.md`), configuraciones (`-config.md`) y stubs de acciones (`-actions.js`).
- El sistema contiene un `runner` de demostración en Node.js y una GitHub Action que dispara el runner al pushear PDFs.
- Falta estandarizar runtime (mezcla Node.js y utilidades en Python), y falta integración completa con LLMs y parsers reales.

## Revisión por agente (A0–A17)

- A0 (Orquestador Maestro): existe `agent-0-actions.js` con funciones de estado mínimas. Recomendado: implementar uilización en runner para registrar y orquestar tareas reales y usar `shared/retries.js`.

- A1 (Analista Especificaciones): `agent-1-actions.js` ahora integra `pdf-parse` si está instalado y retorna un spec mínimo. Problema: la extracción es heurística y necesita reglas/regex más robustas y pruebas con PDFs reales.
  - Acción: añadir tests en `tests/fixtures/` y mejorar extracción (titulos, personajes, bullets).

- A2 (Planificador): stub `agent-2-actions.js` genera tareas simples. Recomendado: asegurar salida JSON con campos `task_id`, `assigned_to`, `dependencies` y validar con JSON Schema.

- A3 (DB), A4 (Backend), A5 (Frontend), A6 (Infra): stubs que generan SQL, endpoints y Docker snippets. Recomendado: integrar linters y generadores de migraciones reales.

- A7–A16 (Validadores consultivos): funciones unificadas de validación simulan reportes JSON. Recomendado: conectar herramientas reales (ESLint/Sonar, Jest, OWASP ZAP, FOSSA, JMeter) o agregar adapters que llamen a servicios.

- A17 (Maestro de Calidad): la lógica de agregación está implementada como función `agente_17_maestro_calidad`. Recomendado: estandarizar formato de informes (schema) y persistir resultados.

## Integración OpenRouter (LLM)

1. Configuración:
   - Añadido `shared/openrouter.js` que llama al endpoint de OpenRouter usando `OPENROUTER_API_KEY` en variables de entorno.
   - `.env.example` actualizado con `OPENROUTER_API_KEY` y `OPENROUTER_API_URL`.
   - `models-config.json` incluye una entrada `openrouter` con endpoint y nota.

2. Uso:
   - El `runner` (`src/runner.js`) realiza una llamada demo a OpenRouter si `OPENROUTER_API_KEY` está presente.
   - Para especificar modelo concreto use `process.env.OPENROUTER_MODEL` (ej: `x-ai/grok-1:free` o el modelo que tu cuenta de OpenRouter permita).

3. Recomendación operativa:
   - Mantén la autenticación en GitHub Secrets para CI (ej. `OPENROUTER_API_KEY`).
   - Define `models-config.json` con mapeos por agente a modelos concretos y límites de tokens.

## Detectar PDFs y disparar pipeline
- Se creó `.github/workflows/pdf-trigger.yml` para ejecutar el runner al pushear PDFs. Nota: el workflow asume Node.js y que `node src/runner.js <path>` procese el PDF.
- Recomendación: añadir validación del archivo y tests de integración en Actions (por ejemplo, ejecutar con un fixture PDF).

## Errores críticos / puntos de atención
- Mezcla de runtimes (Node.js vs Python) — estandarizar preferiblemente en uno.
- Stubs devuelven strings no estructurados; normalizar outputs (JSON o rutas de artefactos) para que el orquestador los lea.
- Falta gestión central de secretos (`.env` y GitHub Secrets).

## Acciones prioritarias sugeridas (sprint inmediato)
1. Añadir `OPENROUTER_API_KEY` en GitHub Secrets y documentarlo en `README.md`.
2. Implementar validación JSON Schema para outputs de A1/A2.
3. Mejorar `agent-1-actions.js` con reglas de extracción y más fixtures.
4. Añadir una versión del runner orientada a `agent-0` (usar message bus simple / state store) y persistir estado en `state/`.

---
Si quieres, aplico ahora cualquiera de las acciones prioritarias (p. ej. configurar `call_model` para usar OpenRouter de forma central, o convertir las salidas de los stubs a JSON estructurado). Indica cuál prefieres primero.
