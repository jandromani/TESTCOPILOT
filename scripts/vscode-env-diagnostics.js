#!/usr/bin/env node

/**
 * VSCode Environment Diagnostics
 * Comprehensive check for connectivity issues in VSCode
 * 
 * Usage: node scripts/vscode-env-diagnostics.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.gray}🔍${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}`),
};

class VSCodeDiagnostics {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.results = {};
  }

  async run() {
    console.log(`\n${colors.bright}🔧 VSCode Environment Diagnostics${colors.reset}`);
    console.log(`Generated: ${new Date().toISOString()}\n`);

    // Run all diagnostics
    await this.checkEnvVariables();
    await this.checkNodeEnvironment();
    await this.checkEnvFile();
    await this.checkDNS();
    await this.checkHTTPSConnectivity();
    await this.checkProxy();
    await this.checkNodeModules();
    await this.checkFirewall();
    await this.testOpenRouterConnection();

    // Summary
    this.printSummary();
  }

  async checkEnvVariables() {
    log.section('1. Environment Variables in VSCode');

    const requiredVars = ['OPENROUTER_API_KEY', 'ENABLE_LLM', 'OPENROUTER_API_URL'];
    const presentVars = {};

    console.log('\n📋 Variables loaded in current process:\n');

    for (const varName of requiredVars) {
      const value = process.env[varName];
      const status = value ? colors.green : colors.red;
      const symbol = value ? '✓' : '✗';
      
      presentVars[varName] = !!value;
      
      if (value) {
        // Hide sensitive data
        const displayValue = varName === 'OPENROUTER_API_KEY' 
          ? value.substring(0, 20) + '...' 
          : value;
        log.debug(`${symbol} ${varName} = ${displayValue}`);
      } else {
        log.warn(`${varName} is NOT set`);
        this.warnings.push(`${varName} missing from environment`);
      }
    }

    this.results.envVariables = presentVars;

    // Check if variables are accessible
    if (!presentVars['OPENROUTER_API_KEY']) {
      this.issues.push('OPENROUTER_API_KEY not in VSCode environment');
    }
  }

  async checkEnvFile() {
    log.section('2. .env File Status');

    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
      log.success(`.env file exists at: ${envPath}`);
      
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        
        log.info(`${lines.length} non-empty lines in .env`);
        log.debug(`File size: ${fs.statSync(envPath).size} bytes`);
        
        // Check for OPENROUTER_API_KEY
        const hasKey = content.includes('OPENROUTER_API_KEY');
        const hasEnable = content.includes('ENABLE_LLM');
        
        if (hasKey) log.success('OPENROUTER_API_KEY found in .env');
        else log.error('OPENROUTER_API_KEY NOT found in .env');
        
        if (hasEnable) log.success('ENABLE_LLM found in .env');
        else log.warn('ENABLE_LLM NOT found in .env');

        this.results.envFile = { exists: true, hasKey, hasEnable };
      } catch (err) {
        log.error(`Error reading .env: ${err.message}`);
        this.issues.push('Cannot read .env file');
      }
    } else {
      log.error(`.env file NOT found at: ${envPath}`);
      this.issues.push('.env file missing');
    }
  }

  async checkNodeEnvironment() {
    log.section('3. Node.js Environment');

    log.info(`Node Version: ${process.version}`);
    log.info(`Node Platform: ${process.platform}`);
    log.info(`Node Arch: ${process.arch}`);
    log.info(`CWD: ${process.cwd()}`);
    log.info(`npm Version: ${require('child_process').execSync('npm --version', { encoding: 'utf-8' }).trim()}`);

    const nodeVersion = parseInt(process.version.substring(1).split('.')[0]);
    if (nodeVersion >= 18) {
      log.success(`Node ${nodeVersion} has global fetch support`);
      this.results.nodeVersion = nodeVersion;
    } else {
      log.error(`Node ${nodeVersion} does NOT have global fetch`);
      this.issues.push('Node version < 18 (no global fetch)');
    }
  }

  async checkDNS() {
    log.section('4. DNS Resolution Check');

    try {
      log.debug('Testing DNS resolution for api.openrouter.ai...');
      const address = await dns.resolve4('api.openrouter.ai');
      log.success(`✓ DNS resolved to: ${address.join(', ')}`);
      this.results.dns = { success: true, address };
    } catch (err) {
      log.error(`✗ DNS resolution failed: ${err.code} - ${err.message}`);
      this.issues.push(`DNS resolution failed: ${err.code}`);
      this.results.dns = { success: false, error: err.code };
    }
  }

  async checkHTTPSConnectivity() {
    log.section('5. HTTPS Connectivity Test');

    return new Promise((resolve) => {
      log.debug('Testing HTTPS connection to api.openrouter.ai:443...');

      const socket = net.createConnection(443, 'api.openrouter.ai', () => {
        socket.destroy();
        log.success('✓ TCP connection to port 443 successful');
        this.results.tcpConnection = true;
        resolve();
      });

      socket.on('error', (err) => {
        log.error(`✗ TCP connection failed: ${err.code} - ${err.message}`);
        this.issues.push(`TCP connection failed: ${err.code}`);
        this.results.tcpConnection = false;
        resolve();
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        log.error('✗ TCP connection timeout');
        this.issues.push('TCP connection timeout');
        this.results.tcpConnection = false;
        resolve();
      });
    });
  }

  async checkProxy() {
    log.section('6. Proxy Configuration');

    const proxyVars = [
      'HTTP_PROXY', 'http_proxy',
      'HTTPS_PROXY', 'https_proxy',
      'ALL_PROXY', 'all_proxy',
      'NO_PROXY', 'no_proxy'
    ];

    let proxyFound = false;
    for (const varName of proxyVars) {
      const value = process.env[varName];
      if (value) {
        log.info(`${varName}: ${value}`);
        proxyFound = true;
      }
    }

    if (!proxyFound) {
      log.success('No proxy configured (direct connection)');
    }

    this.results.proxy = proxyFound;
  }

  async checkNodeModules() {
    log.section('7. Node Modules Check');

    const requiredModules = ['node-fetch', 'pdf-parse', 'dotenv'];
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');

    if (fs.existsSync(nodeModulesPath)) {
      log.success('node_modules directory exists');
      
      for (const mod of requiredModules) {
        const modPath = path.join(nodeModulesPath, mod);
        if (fs.existsSync(modPath)) {
          log.success(`✓ ${mod} is installed`);
        } else {
          log.warn(`✗ ${mod} NOT found (may not be needed)`);
        }
      }
    } else {
      log.error('node_modules directory NOT found');
      this.issues.push('Dependencies not installed');
    }
  }

  async checkFirewall() {
    log.section('8. Firewall/Network Detection (Windows)');

    if (process.platform === 'win32') {
      try {
        log.debug('Checking Windows Firewall status...');
        const { stdout } = await execAsync('Get-NetFirewallProfile | Select-Object Name,Enabled', {
          shell: 'powershell.exe'
        });
        
        log.debug('Firewall status:\n' + stdout);
        
        if (stdout.includes('True')) {
          log.warn('⚠️ Windows Firewall is ENABLED');
          this.warnings.push('Firewall may be blocking connections');
        } else {
          log.success('Windows Firewall is disabled or not blocking');
        }
      } catch (err) {
        log.debug(`Could not check firewall: ${err.message}`);
      }
    } else {
      log.info('Platform is not Windows (firewall check skipped)');
    }
  }

  async testOpenRouterConnection() {
    log.section('9. Test OpenRouter Connection');

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      log.error('Cannot test: OPENROUTER_API_KEY not set');
      this.issues.push('Cannot test OpenRouter without API key');
      return;
    }

    return new Promise((resolve) => {
      log.debug('Testing actual connection to OpenRouter API...');

      const options = {
        hostname: 'api.openrouter.ai',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'worldminiapp-diagnostics',
        },
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            log.success(`✓ OpenRouter API responding (status: ${res.statusCode})`);
            this.results.openRouterAPI = { success: true, status: res.statusCode };
          } else if (res.statusCode === 401) {
            log.error(`API Key may be invalid (status: ${res.statusCode})`);
            this.issues.push('OpenRouter API returned 401 (invalid key?)');
            this.results.openRouterAPI = { success: false, status: res.statusCode, reason: 'Unauthorized' };
          } else {
            log.warn(`OpenRouter responded with status: ${res.statusCode}`);
            this.results.openRouterAPI = { success: true, status: res.statusCode };
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        log.error(`✗ Connection to OpenRouter failed: ${err.code} - ${err.message}`);
        this.issues.push(`OpenRouter connection error: ${err.code}`);
        this.results.openRouterAPI = { success: false, error: err.code };
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        log.error('✗ Request to OpenRouter timed out');
        this.issues.push('OpenRouter request timeout');
        this.results.openRouterAPI = { success: false, error: 'timeout' };
        resolve();
      });

      // Send test request
      const payload = JSON.stringify({
        model: 'grok-2-1212',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      });

      req.write(payload);
      req.end();
    });
  }

  printSummary() {
    log.section('DIAGNOSTIC SUMMARY');

    console.log('\n📊 Results:\n');
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      log.success('✅ All checks passed! System is ready.');
      console.log('\n✨ You can now run:');
      console.log('   node scripts/run-pipeline.js tests/fixtures/example-spec.json\n');
    } else {
      if (this.issues.length > 0) {
        console.log(`${colors.red}🚨 ISSUES FOUND (${this.issues.length}):${colors.reset}`);
        this.issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
      }

      if (this.warnings.length > 0) {
        console.log(`\n${colors.yellow}⚠️ WARNINGS (${this.warnings.length}):${colors.reset}`);
        this.warnings.forEach((warn, i) => {
          console.log(`   ${i + 1}. ${warn}`);
        });
      }

      console.log('\n🔧 RECOMMENDED ACTIONS:\n');
      
      if (this.issues.some(i => i.includes('DNS'))) {
        console.log('   1. DNS Resolution Failed:');
        console.log('      - Check internet connection');
        console.log('      - Try: ipconfig /all (check DNS servers)');
        console.log('      - Try: nslookup api.openrouter.ai (manual DNS test)');
      }

      if (this.issues.some(i => i.includes('TCP'))) {
        console.log('   2. TCP Connection Failed:');
        console.log('      - Check firewall settings');
        console.log('      - Port 443 may be blocked');
        console.log('      - Try: Test-NetConnection -ComputerName api.openrouter.ai -Port 443');
      }

      if (this.issues.some(i => i.includes('OPENROUTER_API_KEY'))) {
        console.log('   3. API Key Not Found:');
        console.log('      - Manually set in VSCode terminal:');
        console.log('        $env:OPENROUTER_API_KEY = "your-key-here"');
        console.log('      - Restart VSCode and try again');
      }

      if (this.issues.some(i => i.includes('dependencies'))) {
        console.log('   4. Dependencies Missing:');
        console.log('      - Run: npm install');
      }

      if (this.issues.some(i => i.includes('Unauthorized'))) {
        console.log('   5. API Key Invalid:');
        console.log('      - Check your key at: https://openrouter.ai');
        console.log('      - Generate new key if needed');
      }

      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Fix issues above');
      console.log('   2. Re-run this diagnostic:');
      console.log('      node scripts/vscode-env-diagnostics.js');
      console.log('   3. Once all green, run pipeline:');
      console.log('      node scripts/run-pipeline.js tests/fixtures/example-spec.json\n');
    }

    // Save results to file
    this.saveResults();
  }

  saveResults() {
    const reportPath = path.join(process.cwd(), 'state', 'diagnostics-report.json');
    const stateDir = path.join(process.cwd(), 'state');

    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      issues: this.issues,
      warnings: this.warnings,
      results: this.results,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log.debug(`\nDiagnostics report saved to: ${reportPath}`);
  }
}

// Run diagnostics
const diagnostics = new VSCodeDiagnostics();
diagnostics.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
