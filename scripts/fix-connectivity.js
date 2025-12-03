#!/usr/bin/env node

/**
 * CONNECTIVITY FIX KIT
 * 
 * This script helps you recover OpenRouter connectivity in VSCode
 * It provides guided solutions based on your diagnostic results
 * 
 * Usage: node scripts/fix-connectivity.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.bright}${colors.blue}Step ${num}:${colors.reset} ${msg}`),
};

class ConnectivityFixKit {
  constructor() {
    this.diagnosticsReport = null;
    this.loadDiagnostics();
  }

  loadDiagnostics() {
    const reportPath = path.join(process.cwd(), 'state', 'diagnostics-report.json');
    if (fs.existsSync(reportPath)) {
      this.diagnosticsReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    }
  }

  run() {
    log.title(`🔧 CONNECTIVITY FIX KIT - WorldMiniApp`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Check if we have diagnostic data
    if (!this.diagnosticsReport) {
      log.warn('No previous diagnostics found');
      log.step(0, 'Run diagnostics first');
      console.log('\n  node scripts/vscode-env-diagnostics.js\n');
      process.exit(1);
    }

    const issues = this.diagnosticsReport.issues || [];
    
    if (issues.length === 0) {
      log.success('No issues detected! System is ready.');
      console.log('\nRun pipeline:');
      console.log('  node scripts/run-pipeline.js tests/fixtures/example-spec.json\n');
      return;
    }

    // Show diagnostics summary
    this.showDiagnosticsSummary();

    // Determine issue type and recommend fix
    this.recommendFix(issues);

    // Provide actionable steps
    this.provideSteps();
  }

  showDiagnosticsSummary() {
    log.section('📊 Diagnostic Summary');

    const results = this.diagnosticsReport.results || {};
    
    console.log('\nDetected Issues:');
    console.log('  • DNS Resolution: ' + (results.dns?.success ? '✅ Working' : '❌ Failed'));
    console.log('  • TCP Connection: ' + (results.tcpConnection ? '✅ Working' : '❌ Failed'));
    console.log('  • Firewall: ' + (results.proxy ? '⚠️ Proxy detected' : '✅ No proxy'));
    console.log('  • Node Modules: ' + (results.nodeModules ? '✅ Installed' : '⚠️ Missing'));
  }

  recommendFix(issues) {
    log.section('💡 Recommended Solution');

    const dnsIssue = issues.some(i => i.includes('DNS'));
    const tcpIssue = issues.some(i => i.includes('TCP'));
    const firewallIssue = issues.some(i => i.includes('Firewall'));

    if (dnsIssue || tcpIssue) {
      console.log('\n🔴 MAIN ISSUE: Network/Firewall blocking api.openrouter.ai\n');
      
      console.log('The system is working, but your network prevents outbound HTTPS to OpenRouter.\n');
      
      console.log('BEST FIX (5 minutes):');
      console.log('  1. Install VPN (ProtonVPN/ExpressVPN/NordVPN/Mullvad)');
      console.log('  2. Connect to a server');
      console.log('  3. Re-run diagnostics');
      console.log('  4. Pipeline will work!\n');

      console.log('ALTERNATIVES (if VPN unavailable):');
      console.log('  • Proxy: Set $env:HTTPS_PROXY = "..."');
      console.log('  • Firewall: Disable Windows Defender or add VSCode exception');
      console.log('  • Cloud: Deploy to GitHub Codespaces / Google Cloud Shell');
      console.log('  • ISP: Contact ISP to whitelist api.openrouter.ai:443\n');
    }

    if (firewallIssue) {
      console.log('\n🟡 SECONDARY ISSUE: Windows Firewall is enabled\n');
      
      console.log('Options:');
      console.log('  • Temporarily disable for testing');
      console.log('  • Add VSCode/Node exception');
      console.log('  • Use VPN to bypass firewall\n');
    }
  }

  provideSteps() {
    log.section('📋 Step-by-Step Recovery');

    console.log(`\n${colors.bright}Option 1: Use VPN (RECOMMENDED - Fastest)${colors.reset}\n`);
    console.log('  1. Download: https://protonvpn.com/download');
    console.log('  2. Install and launch ProtonVPN');
    console.log('  3. Connect to any server');
    console.log('  4. Run: node scripts/vscode-env-diagnostics.js');
    console.log('  5. If all green → pipeline ready!\n');

    console.log(`${colors.bright}Option 2: Configure Proxy${colors.reset}\n`);
    console.log('  1. Get proxy URL from your IT department');
    console.log('  2. In PowerShell, set:');
    console.log('     $env:HTTPS_PROXY = "http://proxy:8080"');
    console.log('  3. Run: node scripts/test-openrouter-direct.js\n');

    console.log(`${colors.bright}Option 3: Disable Firewall (Testing Only)${colors.reset}\n`);
    console.log('  1. Open PowerShell as Administrator');
    console.log('  2. Run:');
    console.log('     Set-NetFirewallProfile -Enabled $false');
    console.log('  3. Test: node scripts/vscode-env-diagnostics.js');
    console.log('  4. Re-enable when done: Set-NetFirewallProfile -Enabled $true\n');

    console.log(`${colors.bright}Option 4: Use Cloud Environment${colors.reset}\n`);
    console.log('  • GitHub Codespaces:');
    console.log('    - Fork repo to GitHub');
    console.log('    - Click "Codespaces" → "Create on main"');
    console.log('    - Run: npm install && node scripts/run-pipeline.js\n');

    console.log('  • Google Cloud Shell (free):');
    console.log('    - Go to: https://console.cloud.google.com');
    console.log('    - Click "Activate Cloud Shell"');
    console.log('    - Upload files and run\n');

    log.section('✅ What To Do Next');

    console.log('\n1. Choose a fix from above');
    console.log('2. Apply the fix (5-30 minutes)');
    console.log('3. Re-run diagnostics:');
    console.log('   node scripts/vscode-env-diagnostics.js');
    console.log('4. When all green, run pipeline:');
    console.log('   node scripts/run-pipeline.js tests/fixtures/example-spec.json\n');

    console.log(`${colors.green}💚 Or continue WITHOUT LLM (system still works):${colors.reset}\n`);
    console.log('  $env:ENABLE_LLM = "0"');
    console.log('  node scripts/run-pipeline.js tests/fixtures/example-spec.json\n');
  }
}

const kit = new ConnectivityFixKit();
kit.run();
