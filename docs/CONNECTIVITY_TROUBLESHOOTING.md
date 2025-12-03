# Connectivity Issue Diagnosis & Resolution Guide

## Problem Summary

**Issue:** The system cannot connect to `api.openrouter.ai` to call LLMs.

**Root Cause:** DNS resolution of `api.openrouter.ai` fails with `ENOTFOUND` error.

**Impact:** 
- LLM calls fail immediately
- Circuit breaker opens after 3 consecutive failures
- System falls back to placeholders (agents still work without LLM enhancements)
- All 18 agents complete successfully but without AI-powered generation

---

## Diagnostic Results

| Test | Result | Status |
|------|--------|--------|
| DNS Resolution | ENOTFOUND | ❌ Failed |
| TCP Connection (port 443) | getaddrinfo ENOTFOUND | ❌ Failed |
| HTTPS Request | Skipped (TCP failed) | ⏭️ Blocked |

**Error Codes Observed:**
- `ENOTFOUND api.openrouter.ai` — DNS cannot resolve hostname
- `getaddrinfo ENOTFOUND` — Name resolution failed at socket level

---

## Possible Causes (in order of likelihood)

### 1. **ISP/Network-Level Blocking** (Most Likely)
   - ISP blocks DNS queries to `api.openrouter.ai`
   - Firewall blocks outbound HTTPS (port 443) to external APIs
   - Corporate network policies restrict external API access

### 2. **DNS Configuration Issue**
   - Misconfigured DNS servers
   - Local DNS cache stale or corrupted
   - DNS rebinding protection blocking API domains

### 3. **Firewall/Security Software**
   - Windows Defender or third-party antivirus blocking egress
   - Corporate proxy intercepting and blocking requests
   - VPN/tunnel configuration preventing outbound connections

### 4. **OpenRouter API Status**
   - API endpoint temporarily unavailable
   - Account suspended or API key revoked
   - Service degradation on OpenRouter side

---

## Resolution Steps

### **Option A: Verify ISP/Firewall Settings** (Recommended First)

```powershell
# 1. Check if any DNS servers are accessible
nslookup google.com
nslookup github.com

# 2. If those work but api.openrouter.ai doesn't:
#    Your ISP may be selectively blocking OpenRouter

# 3. Try pinging external IPs to verify basic connectivity
ping 8.8.8.8       # Google DNS
ping 1.1.1.1       # Cloudflare DNS
```

**Action:** Contact your ISP or network administrator and ask:
- "Is outbound HTTPS (port 443) to `api.openrouter.ai` blocked?"
- "Are there firewall rules restricting external API calls?"
- "Can you whitelist `api.openrouter.ai` for my network?"

---

### **Option B: Use a Proxy** (If ISP allows proxy traffic)

```powershell
# Set proxy environment variables
$env:HTTPS_PROXY = "http://proxy.example.com:8080"
$env:HTTP_PROXY = "http://proxy.example.com:8080"

# Re-run the pipeline
$env:OPENROUTER_API_KEY = 'your-key-here'
$env:ENABLE_LLM = '1'
node scripts/run-all-agents.js tests/fixtures/example-spec.json
```

**Note:** Replace `proxy.example.com:8080` with your actual proxy details (get from your network admin).

---

### **Option C: Use a VPN** (Most reliable workaround)

1. **Install a VPN client:**
   - ProtonVPN (free tier available)
   - ExpressVPN
   - NordVPN
   - Mullvad (open-source)

2. **Connect to VPN:**
   ```powershell
   # (Use VPN client GUI or CLI)
   # Re-run diagnostics to verify connectivity
   node scripts/network-diagnostics.js
   ```

3. **Once connected, re-run pipeline:**
   ```powershell
   $env:OPENROUTER_API_KEY = 'your-key-here'
   $env:ENABLE_LLM = '1'
   node scripts/run-all-agents.js tests/fixtures/example-spec.json
   ```

---

### **Option D: Use Cloud/Container Environment**

If you don't have ISP/firewall access, run the system in a cloud environment:

**Docker (Recommended):**
```bash
docker build -t worldminiapp .
docker run -e OPENROUTER_API_KEY='your-key' \
           -e ENABLE_LLM='1' \
           -v $(pwd)/state:/app/state \
           worldminiapp node scripts/run-all-agents.js tests/fixtures/example-spec.json
```

**Cloud Platforms:**
- AWS Lambda / EC2
- Google Cloud Functions / Compute Engine
- Azure Functions / VMs
- Render / Railway / Heroku (Node.js hosting)

---

### **Option E: Verify OpenRouter Account**

1. **Check API Key validity:**
   - Go to https://openrouter.ai/login
   - Verify your account is active
   - Confirm your API key (in account settings)

2. **Check account status:**
   - Verify you have credit/subscription (for paid models)
   - Confirm free tier access is enabled
   - Check for any account warnings or suspensions

3. **Re-generate API key if needed:**
   ```powershell
   # Update .env with new key
   $env:OPENROUTER_API_KEY = 'sk-or-v1-new-key-here'
   
   # Re-run diagnostics
   node scripts/network-diagnostics.js
   ```

---

## Current System Status (Without LLM Connectivity)

✅ **Fully Operational:**
- All 18 agents execute successfully
- Schema validation works
- Fallback graceful degradation active
- Metrics capture enabled
- Circuit breaker protecting system
- State persistence functional

❌ **LLM Features Disabled:**
- No AI-powered code generation
- No intelligent analysis/summaries
- Generic placeholders returned
- 0 tokens consumed

**Example run with no connectivity:**
```json
{
  "llm_calls": 3,
  "llm_errors": 3,
  "circuit_breaker_status": "OPEN",
  "agents_completed": 18,
  "artifacts_generated": 18
}
```

---

## Quick Test After Fix

Once you resolve connectivity (via proxy, VPN, or ISP fix):

```powershell
# 1. Verify connectivity
node scripts/network-diagnostics.js

# 2. If all tests pass, run pipeline
$env:OPENROUTER_API_KEY = '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'
$env:ENABLE_LLM = '1'
node scripts/run-all-agents.js tests/fixtures/example-spec.json

# 3. Check metrics (should show llm_calls > 0)
cat state/metrics.json
```

---

## Workaround: Continue Without LLM (For Now)

If you cannot fix connectivity, you can still:
- ✅ Process specifications (JSON/PDF)
- ✅ Generate basic code templates
- ✅ Create database schemas
- ✅ Build API endpoint stubs
- ✅ Generate UI component skeletons
- ✅ Run full validation pipeline

```powershell
# Run without LLM (all agents work)
$env:ENABLE_LLM = '0'
node scripts/run-all-agents.js tests/fixtures/example-spec.json
```

---

## Support & Next Steps

If you've tried all options:
1. **Document your environment:**
   - ISP/network provider
   - Firewall brand (corporate or home)
   - Your error messages

2. **Contact options:**
   - OpenRouter Support: https://openrouter.ai/support
   - Your ISP Support
   - Your network administrator (if corporate)

3. **Alternative approaches:**
   - Use on-premise LLM (Ollama, LLaMA.cpp)
   - Switch to different LLM provider (Claude API, OpenAI, etc.)
   - Implement hybrid approach (cache results, use LLM on connected machine)

---

**Last Updated:** 2025-12-03  
**Report Generated:** 2025-12-03T09:41:38Z
