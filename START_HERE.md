# 5-Minute Start

Inicia el sistema completo de agentes en 5 minutos.

## Step 1: Get Your Free API Key (1 min)

1. Go to: https://openrouter.ai/
2. Click "Sign Up" (free)
3. Navigate to "Account" → "API Keys"
4. Click "Create Key" and copy it

## Step 2: Configure (2 min)

```bash
# Navigate to project
cd worldminiapp/vscode

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Open .env in your editor
# Find: OPENROUTER_API_KEY=your-key-here
# Replace with your actual key from Step 1
```

## Step 3: Validate (1 min)

```bash
npm run validate
```

You should see:
```
✅ Environment Setup
✅ Shared Utilities
✅ Models Configuration
✅ Agent Structure
✅ Runner Script
✅ Package Dependencies

Passed: 6/6
✅ All checks passed! You can run: npm start
```

## Step 4: Run (1 min)

```bash
# Run with example spec
npm start tests/fixtures/example-spec.json

# Or without input (creates dummy specs)
npm start
```

## Step 5: See Results

```bash
# View full output
cat state/runner-state.json | jq .

# View just the summary
cat state/runner-state.json | jq '.agents | keys'

# View generated artifacts
ls -la state/
```

---

## ✅ You're Done!

Your 17-agent system just:
1. ✅ Parsed a specification
2. ✅ Generated a task plan
3. ✅ Created SQL schemas
4. ✅ Generated API endpoints
5. ✅ Generated UI components
6. ✅ Called OpenRouter LLM for summary

All in **1 minute**.

---

## 🤔 Next Steps

- **Push to GitHub**: `git add . && git commit -m "init" && git push origin main`
  → GitHub Actions will validate your setup

- **Add Your Own PDF**: Push a PDF file
  → Automatic trigger will process it

- **Explore Agents**: `cat custom-agents/agent-1/agent-1.agent.md`
  → See what each agent does

- **Read Full Docs**: `cat QUICKSTART.md` or `cat README.md`

---

## 🆘 Common Issues

**"OPENROUTER_API_KEY not found"**
- Make sure .env has your key: `OPENROUTER_API_KEY=sk-...`
- Not just the placeholder text

**"Cannot find module"**
- Run: `npm install`

**"No output generated"**
- Check: `cat state/runner-state.json`
- Verify agents executed with status='ok'

---

**¡Felicidades!** You're running a 17-agent AI orchestration system. 🎉
