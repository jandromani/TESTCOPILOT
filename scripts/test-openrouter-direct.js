#!/usr/bin/env node

/**
 * Force Load .env and Test OpenRouter Connectivity
 * This script explicitly loads .env variables and tests OpenRouter connection
 * 
 * Usage: node scripts/test-openrouter-direct.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}`);
};

async function main() {
  console.log(`\n${colors.bright}🧪 Direct OpenRouter Connection Test${colors.reset}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  log.section('Step 1: Load .env Variables');

  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    log.error(`.env file not found at ${envPath}`);
    process.exit(1);
  }

  log.info(`Loading from: ${envPath}`);

  // Force load .env
  const envConfig = dotenv.config({ path: envPath });
  
  if (envConfig.error) {
    log.error(`Error parsing .env: ${envConfig.error.message}`);
    process.exit(1);
  }

  log.success(`Loaded ${Object.keys(envConfig.parsed).length} variables from .env`);

  // Display key variables
  log.section('Step 2: Verify Critical Variables');

  const apiKey = process.env.OPENROUTER_API_KEY;
  const apiUrl = process.env.OPENROUTER_API_URL;
  const enableLLM = process.env.ENABLE_LLM;

  if (!apiKey) {
    log.error('OPENROUTER_API_KEY is not set');
    process.exit(1);
  }

  log.success(`OPENROUTER_API_KEY: ${apiKey.substring(0, 20)}...`);
  log.info(`OPENROUTER_API_URL: ${apiUrl}`);
  log.info(`ENABLE_LLM: ${enableLLM}`);

  log.section('Step 3: Test OpenRouter Connection');

  // Test with actual API call
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'grok-2-1212',
      messages: [
        {
          role: 'user',
          content: 'Test connection - respond with OK if you can read this'
        }
      ],
      max_tokens: 10,
    });

    const options = {
      hostname: 'api.openrouter.ai',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'worldminiapp-test',
        'User-Agent': 'worldminiapp/1.0',
      },
      timeout: 10000,
    };

    log.info('Sending test request to OpenRouter...');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        log.section('Step 4: Response Analysis');

        log.info(`Status Code: ${res.statusCode}`);
        log.info(`Content-Type: ${res.headers['content-type']}`);

        if (res.statusCode === 200) {
          log.success('✓ 200 OK - Connection successful!');
          
          try {
            const response = JSON.parse(data);
            if (response.choices && response.choices[0]) {
              log.success('✓ Valid response from OpenRouter');
              const message = response.choices[0].message?.content || '';
              log.info(`Response: "${message}"`);
              
              log.section('🎉 SUCCESS');
              console.log(`\n✨ OpenRouter is fully accessible from VSCode!`);
              console.log(`\nYou can now run the full pipeline:`);
              console.log(`   $env:ENABLE_LLM='1'`);
              console.log(`   node scripts/run-pipeline.js tests/fixtures/example-spec.json\n`);
              
              resolve();
            }
          } catch (e) {
            log.warn(`Could not parse response: ${e.message}`);
            resolve();
          }
        } else if (res.statusCode === 401) {
          log.error('✗ 401 Unauthorized - API key may be invalid');
          console.log(`\n${colors.red}🚫 Your API key is invalid or expired${colors.reset}`);
          console.log(`Please verify at: https://openrouter.ai\n`);
          reject(new Error('Invalid API key'));
        } else if (res.statusCode === 429) {
          log.warn('✗ 429 Too Many Requests - Rate limited');
          console.log(`\n⏱️ You're being rate limited. Wait a moment and try again.\n`);
          resolve();
        } else {
          log.error(`✗ ${res.statusCode} - Unexpected response`);
          log.info(`Response body: ${data.substring(0, 200)}...`);
          resolve();
        }
      });
    });

    req.on('error', (err) => {
      log.section('Step 4: Error Details');
      
      log.error(`Connection Error: ${err.code} - ${err.message}`);
      
      log.section('🔧 Troubleshooting');

      if (err.code === 'ENOTFOUND') {
        console.log(`\n${colors.red}❌ DNS Resolution Failed${colors.reset}`);
        console.log(`\nThe system cannot resolve api.openrouter.ai`);
        console.log(`This usually means:`);
        console.log(`  • Network is down`);
        console.log(`  • DNS is blocked by ISP/firewall`);
        console.log(`  • Proxy requires authentication`);
        console.log(`\nFix options:`);
        console.log(`  1. Try using a VPN (ProtonVPN, ExpressVPN, etc)`);
        console.log(`  2. Configure proxy: $env:HTTPS_PROXY = "http://proxy:port"`);
        console.log(`  3. Restart your router/network`);
        console.log(`  4. Check Windows Firewall settings\n`);
      } else if (err.code === 'ECONNREFUSED') {
        console.log(`\n${colors.red}❌ Connection Refused${colors.reset}`);
        console.log(`\nPort 443 is blocked`);
        console.log(`\nFix options:`);
        console.log(`  1. Check Windows Firewall`);
        console.log(`  2. Check antivirus software`);
        console.log(`  3. Try from cloud environment\n`);
      } else if (err.code === 'ETIMEDOUT') {
        console.log(`\n${colors.yellow}⏱️ Connection Timeout${colors.reset}`);
        console.log(`\nRequest took too long to respond`);
        console.log(`\nTry again - may be temporary network issue\n`);
      }

      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      log.error('Request timeout (10 seconds exceeded)');
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

main().catch(err => {
  console.error(`\n${colors.red}Fatal Error:${colors.reset} ${err.message}`);
  process.exit(1);
});
