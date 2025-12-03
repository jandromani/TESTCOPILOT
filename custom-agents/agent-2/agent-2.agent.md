# Agente 2 — Planificador de Tareas

## Comportamiento
Divide las especificaciones en tareas asignables y crea un plan de ejecución con dependencias.

## Responsabilidad
- Generar tareas como `create_characters`, `write_prologue`, `create_chapters` y su orden.
- Devolver un plan estructurado al Orquestador.

## Handoffs
- Envía el plan a `agent-3` (DB) y a otros agentes según las tareas requeridas.

## Herramientas
- Generador de tareas y validador de dependencias.

## Archivos
- Config: `agent-2-config.md`
- Acciones: `agent-2-actions.js`
