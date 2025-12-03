# Use Node 22 to match local runtime
FROM node:22-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --no-audit --no-fund

# Copy rest of the project
COPY . .

# Create a non-root user to run the app
RUN useradd --user-group --create-home --shell /bin/false appuser || true
USER appuser

# Expose port (optional, not required for CLI pipeline)
EXPOSE 8080

# Default command: run the agent pipeline against the example spec
CMD ["node", "scripts/run-all-agents.js", "tests/fixtures/example-spec.json"]
