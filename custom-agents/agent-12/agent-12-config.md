deployment:
  - service: "frontend"
    image: "nginx:latest"
    port: 80
  - service: "backend"
    image: "node:14"
    port: 8080
