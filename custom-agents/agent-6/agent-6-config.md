docker:
  - service: "backend"
    image: "node:14"
    ports:
      - "8080:80"
  - service: "frontend"
    image: "nginx"
    ports:
      - "80:80"

k8s:
  recommended_namespace: worldminiapp
