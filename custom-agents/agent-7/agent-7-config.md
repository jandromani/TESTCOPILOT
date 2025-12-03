tools:
  - name: "SonarQube"
    version: "8.9"
    configuration:
      quality_gate: "all"
  - name: "ESLint"
    version: "7.32.0"
    configuration:
      rules:
        - "no-unused-vars"
        - "no-undef"

reporting:
  fail_on_blocker: true
