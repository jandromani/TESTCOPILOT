# Agente 1 — Analista de Especificaciones

## Comportamiento
Extrae los requisitos del libro desde archivos estructurados (JSON) o semi-estructurados (PDF) y los convierte en especificaciones internas.

## Responsabilidad
- Detectar título, personajes, arcos narrativos y puntos de trama.
- Validar que los requisitos mínimos estén presentes (p.ej. autor, género, alcance estimado).

## Handoffs
- Si el análisis es correcto, pasa las especificaciones a `agent-2` (Planificador de Tareas).

## Herramientas
- Lector de PDF, convertidor PDF→JSON, extractor de texto, normalizador.

## Archivos relevantes
- Config: `agent-1-config.md`
- Acciones: `agent-1-actions.js`
