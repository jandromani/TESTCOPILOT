database:
  - table: characters
    columns: [name, role, backstory]
  - table: plot
    columns: [scene_id, description, characters_involved]

migrations:
  format: sql
