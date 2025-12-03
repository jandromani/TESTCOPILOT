# Agente 0 — Orquestador Maestro

## Comportamiento
El Orquestador Maestro coordina todo el flujo de trabajo entre agentes; gestiona dependencias, reintentos y bucles de retroalimentación.

## Responsabilidad
- Mantener el estado global del flujo (pipeline) de creación del libro.
- Encolar y despachar tareas a agentes específicos en orden correcto.
- Reintentar tareas fallidas y escalar errores.

## Handoffs
- Recibe planes desde `agent-2` y asigna subtareas a `agent-3`, `agent-4`, etc.
- Aggrega resultados finales y los entrega al agente de publicación/entrega.

## Herramientas disponibles
- Bus de mensajes (interno en memoria o externalizable).
- Repositorio de estado (puede ser simple JSON en disco o una base de datos ligera).

## Archivos relevantes
- Config: `agent-0-config.md`
- Acciones: `agent-0-actions.js`
