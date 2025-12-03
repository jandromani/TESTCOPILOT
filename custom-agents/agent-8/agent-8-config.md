testing_frameworks:
  - name: "Jest"
    version: "27.0.6"
    configuration:
      coverage: true
  - name: "Cypress"
    version: "8.7.0"
    configuration:
      base_url: "http://localhost:3000"

execution:
  parallel: true
  timeout_seconds: 300
