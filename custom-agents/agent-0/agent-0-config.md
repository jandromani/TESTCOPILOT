tools:
  - tool: InMemoryMessageBus
    config:
      persistence: false
  - tool: StateStore
    config:
      type: json_file
      path: ./state/agent-0-state.json

orchestration:
  max_retries: 3
  retry_delay_seconds: 5
