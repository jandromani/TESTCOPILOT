kubernetes:
  - service: "backend"
    replicas: 3
    container: "node:14"
  - service: "frontend"
    replicas: 2
    container: "nginx"

checks:
  nodes_ready: true
  services_running: true
