#!/usr/bin/env node
/**
 * Network Diagnostics Script for OpenRouter Connectivity
 * Identifies DNS, firewall, and routing issues preventing LLM calls
 */

const https = require('https');
const dns = require('dns').promises;
const net = require('net');

async function diagnose() {
  console.log('🔍 OpenRouter Connectivity Diagnostic Report');
  console.log('═'.repeat(60));
  console.log(`Generated: ${new Date().toISOString()}\n`);

  // 1. DNS Resolution Test
  console.log('1️⃣ DNS RESOLUTION TEST');
  console.log('─'.repeat(60));
  try {
    const addresses = await dns.resolve4('api.openrouter.ai');
    console.log(`✅ DNS resolved successfully`);
    console.log(`   Addresses: ${addresses.join(', ')}`);
  } catch (err) {
    console.log(`❌ DNS resolution failed`);
    console.log(`   Error: ${err.message}`);
    console.log(`   This means your system cannot find the IP for api.openrouter.ai`);
    console.log(`   Possible causes:`);
    console.log(`   - ISP blocking DNS queries to external APIs`);
    console.log(`   - Corporate firewall intercepting DNS`);
    console.log(`   - Misconfigured network settings\n`);
  }

  // 2. TCP Connection Test
  console.log('\n2️⃣ TCP CONNECTION TEST (port 443)');
  console.log('─'.repeat(60));
  const socket = net.createConnection({ host: 'api.openrouter.ai', port: 443, timeout: 5000 });
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log(`✅ TCP connection successful`);
      console.log(`   Successfully reached api.openrouter.ai:443`);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', (err) => {
      console.log(`❌ TCP connection failed`);
      console.log(`   Error: ${err.message} (${err.code})`);
      console.log(`   This means packets cannot reach OpenRouter servers`);
      console.log(`   Possible causes:`);
      console.log(`   - Firewall blocking outbound HTTPS`);
      console.log(`   - ISP blocking port 443 to api.openrouter.ai`);
      console.log(`   - Network routing issues\n`);
      resolve(false);
    });

    socket.on('timeout', () => {
      console.log(`⏱️ TCP connection timeout`);
      console.log(`   Connection attempt took > 5 seconds`);
      console.log(`   This suggests network latency or blocking\n`);
      socket.destroy();
      resolve(false);
    });
  }).then((success) => {
    // 3. HTTPS Request Test
    console.log('3️⃣ HTTPS REQUEST TEST');
    console.log('─'.repeat(60));
    
    if (!success) {
      console.log(`⏭️ Skipping HTTPS test (TCP failed)`);
      return;
    }

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.openrouter.ai',
        port: 443,
        path: '/api/v1/health',  // or a health check endpoint
        method: 'GET',
        timeout: 5000,
        headers: { 'User-Agent': 'Node.js Diagnostic' }
      };

      const req = https.request(options, (res) => {
        console.log(`✅ HTTPS request successful`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   OpenRouter API is reachable`);
        resolve(true);
      });

      req.on('error', (err) => {
        console.log(`❌ HTTPS request failed`);
        console.log(`   Error: ${err.message}`);
        resolve(false);
      });

      req.on('timeout', () => {
        console.log(`⏱️ HTTPS request timeout`);
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  });
}

diagnose().then(() => {
  console.log('\n4️⃣ RESOLUTION STEPS');
  console.log('─'.repeat(60));
  console.log(`If tests failed, try these solutions:\n`);
  console.log(`A) Check firewall/ISP:`);
  console.log(`   - Contact your ISP or network admin`);
  console.log(`   - Ask if outbound HTTPS to api.openrouter.ai is blocked\n`);
  console.log(`B) Use a proxy:`);
  console.log(`   export HTTPS_PROXY=http://proxy.example.com:8080`);
  console.log(`   (Configure proxy details with your network admin)\n`);
  console.log(`C) Use a VPN:`);
  console.log(`   - Connect to a public VPN that allows HTTPS egress`);
  console.log(`   - Re-run tests after VPN connection\n`);
  console.log(`D) Use alternative environment:`);
  console.log(`   - Run pipeline in a cloud environment (AWS, GCP, Azure)`);
  console.log(`   - Run in Docker container with network access\n`);
  console.log(`E) Contact OpenRouter support:`);
  console.log(`   - Verify your API key is active`);
  console.log(`   - Check account status at https://openrouter.ai\n`);
}).catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
