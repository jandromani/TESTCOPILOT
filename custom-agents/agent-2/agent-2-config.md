tasks:
  - task: create_characters
    dependencies: []
  - task: write_prologue
    dependencies: [create_characters]
  - task: outline_chapters
    dependencies: [write_prologue]

rules:
  default_task_owner: agent-3
