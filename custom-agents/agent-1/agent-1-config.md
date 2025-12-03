tools:
  - tool: PDF Reader
    config:
      input_format: pdf
      output_format: json
  - tool: Text Processor
    config:
      rules:
        - extract_title
        - extract_characters
        - extract_plot_points

validation:
  require_author: true
  min_plot_points: 3
