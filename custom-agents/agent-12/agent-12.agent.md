# Agente 12 — Generador y Desplegador

## Comportamiento
Compila artefactos finales y los despliega en el entorno objetivo (Docker, Kubernetes, etc.).

## Responsabilidad
- Generación de imágenes/artefactos.
- Despliegue en contenedores o servidores.
- Validación post-despliegue.

## Handoffs
- Si el despliegue es exitoso, pasa al Agente 13 (Consultor de Seguridad).
- Si hay errores, pasa al Agente 6 para corrección de infraestructura.

## Herramientas disponibles
- Docker, Kubernetes, Terraform, CI/CD.

## Archivos relevantes
- Config: `agent-12-config.md`
- Acciones: `agent-12-actions.js`
