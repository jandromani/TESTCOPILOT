# 🔧 VSCode Connectivity Troubleshooting Guide

**Problem:** LLM calls fail in VSCode but work in v0.dev, BOLT, Google Colab  
**Root Cause:** Environment variable loading, DNS, firewall, or proxy issues specific to VSCode  
**Solution:** Follow this step-by-step guide

---

## Quick Diagnosis (5 minutes)

### Step 1: Run Complete Diagnostics

```powershell
cd C:\Users\abaratas\Desktop\worldminiapp\vscode
node scripts/vscode-env-diagnostics.js
```

**What to look for:**
- ✅ All DNS, TCP, and firewall checks pass
- ❌ Any red X indicates a specific problem

Save the results - you'll see which check failed.

### Step 2: Test Direct OpenRouter Connection

```powershell
node scripts/test-openrouter-direct.js
```

This explicitly:
- Loads `.env` file
- Verifies API key is present
- Attempts actual connection to OpenRouter
- Shows specific error if it fails

---

## Common Issues & Fixes

### Issue 1: DNS Resolution Fails (ENOTFOUND)

**Diagnostic output:**
```
❌ DNS resolution failed: ENOTFOUND api.openrouter.ai
```

**This means:** Your network cannot resolve api.openrouter.ai's IP address

#### Fix Option A: Use VPN (Recommended - Fastest)

1. Download VPN:
   - **ProtonVPN** (free): https://protonvpn.com/download
   - **ExpressVPN**: https://www.expressvpn.com
   - **NordVPN**: https://nordvpn.com
   - **Mullvad** (free): https://mullvad.net

2. Connect to a VPN server

3. Re-run diagnostic:
   ```powershell
   node scripts/vscode-env-diagnostics.js
   ```

4. If DNS now passes, run pipeline:
   ```powershell
   node scripts/run-with-env-check.js tests/fixtures/example-spec.json
   ```

#### Fix Option B: Configure Proxy

If your network uses a proxy:

```powershell
# In VSCode PowerShell terminal:
$env:HTTPS_PROXY = "http://proxy.your-company.com:8080"
$env:HTTP_PROXY = "http://proxy.your-company.com:8080"

# Test again
node scripts/test-openrouter-direct.js
```

#### Fix Option C: Contact Your ISP

If you have a corporate network or ISP blocking OpenRouter:

1. Ask your IT department to whitelist: `api.openrouter.ai` on port 443
2. Provide them: "We need outbound HTTPS access to api.openrouter.ai for AI API calls"

#### Fix Option D: Deploy to Cloud

Use a cloud environment that has unrestricted egress:

```powershell
# Option 1: Google Cloud Shell (free)
# - Go to: https://console.cloud.google.com
# - Click "Activate Cloud Shell"
# - Run: git clone <repo>; cd vscode; npm install; node scripts/run-pipeline.js

# Option 2: GitHub Codespaces (free tier)
# - Fork repo to GitHub
# - Click "Codespaces" tab
# - Click "Create codespace on main"
# - Run: npm install; node scripts/run-pipeline.js tests/fixtures/example-spec.json

# Option 3: Heroku / Railway / Render (free tier)
# - Deploy this app as container
# - API calls will work from cloud
```

---

### Issue 2: Environment Variables Not Loaded

**Diagnostic output:**
```
❌ OPENROUTER_API_KEY is NOT set
❌ ENABLE_LLM is NOT set
```

**This means:** VSCode terminal is not reading `.env` file

#### Fix: Manually Set Variables

In VSCode PowerShell terminal:

```powershell
# Get your API key
$env:OPENROUTER_API_KEY = "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"
$env:ENABLE_LLM = "1"

# Verify
echo $env:OPENROUTER_API_KEY

# Now run diagnostic
node scripts/test-openrouter-direct.js
```

**To persist for this session:**

Create file: `scripts/load-env.ps1`

```powershell
# Load environment variables
$envPath = Join-Path $PSScriptRoot "..\..\.env"
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*([^=]+)=(.*)$') {
    $key = $matches[1].Trim()
    $value = $matches[2].Trim()
    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}
```

Then run before each test:

```powershell
& scripts/load-env.ps1
node scripts/test-openrouter-direct.js
```

---

### Issue 3: Firewall/Antivirus Blocking

**Diagnostic output:**
```
❌ TCP connection failed: ECONNREFUSED
❌ Windows Firewall is ENABLED
```

**This means:** Port 443 is blocked by firewall/antivirus

#### Fix Windows Firewall

1. **Temporarily disable** (for testing):
   ```powershell
   # Run as Administrator
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled $false
   ```

2. **Or add VSCode exception:**
   ```powershell
   # Run as Administrator
   $VSCodePath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Microsoft VS Code\Code.exe"
   New-NetFirewallRule -DisplayName "VSCode HTTPS" -Direction Outbound -Program $VSCodePath -Action Allow -RemotePort 443 -Protocol TCP
   ```

3. **Or add Node exception:**
   ```powershell
   # Run as Administrator
   $NodePath = "C:\Program Files\nodejs\node.exe"
   New-NetFirewallRule -DisplayName "Node HTTPS" -Direction Outbound -Program $NodePath -Action Allow -RemotePort 443 -Protocol TCP
   ```

4. Test:
   ```powershell
   node scripts/test-openrouter-direct.js
   ```

---

### Issue 4: Invalid API Key

**Diagnostic output:**
```
❌ API Key may be invalid (status: 401)
```

**This means:** Your OpenRouter API key is wrong or expired

#### Fix

1. Go to: https://openrouter.ai
2. Sign in (or create account)
3. Go to "Settings" or "Keys"
4. Copy your API key
5. Update `.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-YOUR-NEW-KEY-HERE
   ```

6. In VSCode terminal:
   ```powershell
   $env:OPENROUTER_API_KEY = "sk-or-v1-YOUR-NEW-KEY-HERE"
   node scripts/test-openrouter-direct.js
   ```

---

## Full Troubleshooting Flowchart

```
START
  ↓
Run: node scripts/vscode-env-diagnostics.js
  ↓
  ├─→ DNS FAILS?
  │    ├─ Try VPN → Re-test
  │    ├─ Try proxy → Re-test
  │    ├─ Call ISP
  │    └─ Use cloud environment
  │
  ├─ TCP FAILS?
  │    ├─ Disable firewall
  │    ├─ Add VSCode/Node exception
  │    └─ Contact IT if corporate
  │
  ├─ VARIABLES NOT LOADED?
  │    ├─ Manually set: $env:OPENROUTER_API_KEY = "..."
  │    └─ Re-test
  │
  ├─ API RETURNS 401?
  │    ├─ Check key at openrouter.ai
  │    ├─ Generate new key
  │    └─ Re-test
  │
  └─ ALL PASS? ✅
       ↓
       Run: node scripts/run-with-env-check.js tests/fixtures/example-spec.json
       ↓
       ✨ SUCCESS
```

---

## Step-by-Step Recovery Process

### Step 1: Baseline Test (No Changes)

```powershell
cd C:\Users\abaratas\Desktop\worldminiapp\vscode
node scripts/vscode-env-diagnostics.js 2>&1 | Tee-Object -FilePath diagnostics-baseline.txt
```

**Save output** - you'll need it if things don't improve.

### Step 2: Try VPN First (Recommended)

```powershell
# Install ProtonVPN or ExpressVPN
# Connect to a server
# Then run:

node scripts/test-openrouter-direct.js
```

If it shows ✅ 200 OK and success message → **You're done!**

### Step 3: If VPN Worked, Keep Using It

```powershell
# Every time before running agents:
# 1. Connect to VPN
# 2. Then run:

$env:OPENROUTER_API_KEY = "sk-or-v1-..."
$env:ENABLE_LLM = "1"
node scripts/run-pipeline.js tests/fixtures/example-spec.json
```

### Step 4: If VPN Didn't Work, Try Proxy

Ask your network admin for proxy settings:

```powershell
$env:HTTPS_PROXY = "http://proxy.company.com:8080"
$env:HTTP_PROXY = "http://proxy.company.com:8080"
$env:OPENROUTER_API_KEY = "sk-or-v1-..."

node scripts/test-openrouter-direct.js
```

### Step 5: If Still Failing, Use Cloud

```powershell
# Option A: GitHub Codespaces
# - Fork repo to GitHub
# - Create Codespace
# - Run: npm install && node scripts/run-pipeline.js

# Option B: Google Cloud Shell
# - Go to cloud.google.com
# - Activate Cloud Shell
# - git clone <repo>
# - cd vscode && npm install && node scripts/run-pipeline.js

# Option C: Glitch.com
# - Go to glitch.com
# - Create new project
# - Upload files
# - Works immediately
```

---

## Verification Checklist

After trying a fix, verify with this checklist:

```powershell
# 1. Environment variables set?
echo $env:OPENROUTER_API_KEY
echo $env:ENABLE_LLM

# 2. DNS working?
nslookup api.openrouter.ai

# 3. Port 443 accessible?
Test-NetConnection -ComputerName api.openrouter.ai -Port 443

# 4. Full diagnostic passing?
node scripts/vscode-env-diagnostics.js

# 5. Direct connection working?
node scripts/test-openrouter-direct.js

# 6. Pipeline execution?
node scripts/run-with-env-check.js tests/fixtures/example-spec.json
```

✅ When all 6 pass → LLM is working!

---

## Still Not Working?

### Debug Information to Collect

Run this and save output:

```powershell
# 1. Diagnostics report
node scripts/vscode-env-diagnostics.js > diagnostics.log 2>&1

# 2. Direct test
node scripts/test-openrouter-direct.js > test-direct.log 2>&1

# 3. Network info
ipconfig /all > network-info.log

# 4. DNS test
nslookup api.openrouter.ai > dns-test.log 2>&1

# 5. System info
systeminfo > system-info.log

# Combine all
Get-Content diagnostics.log, test-direct.log, network-info.log, dns-test.log | Out-File combined-debug.txt
```

Then share `combined-debug.txt` for support.

---

## Workaround: Run Without LLM

If you absolutely cannot get LLM working, the system still works perfectly without it:

```powershell
$env:ENABLE_LLM = "0"
node scripts/run-pipeline.js tests/fixtures/example-spec.json
```

✅ All 18 agents execute  
✅ Artifacts are generated  
✅ Fallback templates are used instead of LLM responses  
⚠️ Responses won't be AI-enhanced (but still functional)

---

## Next: Restore Connectivity

1. **Choose a fix:** VPN → Proxy → Firewall → Cloud → ISP
2. **Apply it:** 5-30 minute setup depending on option
3. **Test:** `node scripts/test-openrouter-direct.js`
4. **Celebrate:** ✨ LLM now works!

---

## Questions?

- **Diagnostic issue?** Run: `node scripts/vscode-env-diagnostics.js`
- **Connection issue?** Run: `node scripts/test-openrouter-direct.js`
- **Environment issue?** Check: `cat .env` and `echo $env:OPENROUTER_API_KEY`
- **Network issue?** Try VPN or check firewall
- **API issue?** Verify key at https://openrouter.ai

Good luck! 🚀
