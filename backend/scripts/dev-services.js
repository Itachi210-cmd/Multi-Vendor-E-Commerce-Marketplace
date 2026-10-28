import { execSync, spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse key-value lines from a .env file without external packages
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const envObj = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envObj[key] = val;
    }
  }
  return envObj;
}

// Check TCP port accessibility with timeout
function checkPort(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });

    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });

    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[Dev Services] Checking environment and backing services...');

  // 1. Check SKIP_DOCKER flag in process.env or .env file
  const rootDir = path.resolve(__dirname, '..');
  const envFilePath = path.join(rootDir, '.env');
  const fileEnv = loadEnvFile(envFilePath);
  const skipDockerVal = process.env.SKIP_DOCKER || fileEnv.SKIP_DOCKER;

  if (skipDockerVal === 'true') {
    console.log('[Dev Services] Skipping Docker services (SKIP_DOCKER=true).');
    process.exit(0);
  }

  // 2. Check if Docker CLI is installed
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    console.error('\n❌ [Dev Services] Docker is not installed or not in your system PATH.');
    console.error('   Please install Docker Desktop: https://www.docker.com/products/docker-desktop/');
    console.error('   Or set SKIP_DOCKER=true if you are using hosted/cloud database services.\n');
    process.exit(1);
  }

  // 3. Check if Docker daemon is running (docker info)
  let isDaemonRunning = false;
  try {
    execSync('docker info', { stdio: 'ignore' });
    isDaemonRunning = true;
  } catch {
    isDaemonRunning = false;
  }

  if (!isDaemonRunning) {
    console.log('[Dev Services] Docker daemon is not running.');

    // On Windows, attempt to launch Docker Desktop in the background
    if (process.platform === 'win32') {
      const defaultPaths = [
        path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe'),
        path.join(process.env['LOCALAPPDATA'] || '', 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
      ];

      const foundExe = defaultPaths.find((p) => p && fs.existsSync(p));

      if (foundExe) {
        console.log(`[Dev Services] Launching Docker Desktop from: ${foundExe}`);
        try {
          const child = spawn(foundExe, [], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
        } catch (err) {
          console.warn(`[Dev Services] Warning: Could not auto-start Docker Desktop (${err.message}).`);
        }
      } else {
        console.log('[Dev Services] Docker Desktop executable not found in default paths.');
      }
    }

    // Wait and retry every 3s up to 120s
    console.log('[Dev Services] Waiting for Docker daemon to become responsive (up to 120s)...');
    const startTime = Date.now();
    const maxWaitMs = 120000;

    while (Date.now() - startTime < maxWaitMs) {
      await sleep(3000);
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      try {
        execSync('docker info', { stdio: 'ignore' });
        isDaemonRunning = true;
        console.log(`[Dev Services] Docker daemon is now running (connected in ${elapsedSec}s).`);
        break;
      } catch {
        process.stdout.write(`   ...waiting for Docker daemon (${elapsedSec}s elapsed)\r`);
      }
    }

    if (!isDaemonRunning) {
      console.error('\n❌ [Dev Services] Docker daemon did not respond within 120 seconds.');
      console.error('   Start Docker Desktop and run npm run dev again.\n');
      process.exit(1);
    }
  }

  // 4. Run docker compose up -d mongo redis elasticsearch
  const composePath = path.resolve(__dirname, '../../docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    console.error(`❌ [Dev Services] docker-compose.yml not found at: ${composePath}`);
    process.exit(1);
  }

  console.log('[Dev Services] Starting backing containers: mongo, redis, elasticsearch...');
  try {
    execSync(`docker compose -f "${composePath}" up -d mongo redis elasticsearch`, {
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`\n❌ [Dev Services] Failed to start Docker Compose services: ${err.message}\n`);
    process.exit(1);
  }

  // 5. Wait for ports: MongoDB (27017, up to 60s), Redis (6379, up to 60s), Elasticsearch (9200, up to 90s)
  console.log('[Dev Services] Verifying service port availability...');

  // Wait for MongoDB (27017, required up to 60s)
  let mongoReady = false;
  const mongoStart = Date.now();
  while (Date.now() - mongoStart < 60000) {
    if (await checkPort('127.0.0.1', 27017)) {
      mongoReady = true;
      break;
    }
    await sleep(1500);
  }

  if (mongoReady) {
    console.log('   ✓ MongoDB is ready on port 27017');
  } else {
    console.error('   ❌ MongoDB did not become ready on port 27017 within 60s.');
    process.exit(1);
  }

  // Wait for Redis (6379, required up to 60s)
  let redisReady = false;
  const redisStart = Date.now();
  while (Date.now() - redisStart < 60000) {
    if (await checkPort('127.0.0.1', 6379)) {
      redisReady = true;
      break;
    }
    await sleep(1500);
  }

  if (redisReady) {
    console.log('   ✓ Redis is ready on port 6379');
  } else {
    console.error('   ❌ Redis did not become ready on port 6379 within 60s.');
    process.exit(1);
  }

  // Wait for Elasticsearch (9200, optional up to 90s)
  let esReady = false;
  const esStart = Date.now();
  while (Date.now() - esStart < 90000) {
    if (await checkPort('127.0.0.1', 9200)) {
      esReady = true;
      break;
    }
    await sleep(2000);
  }

  if (esReady) {
    console.log('   ✓ Elasticsearch is ready on port 9200');
  } else {
    console.log('   ⚠️  Warning: Elasticsearch on port 9200 is not ready yet. Product search will automatically use MongoDB regex fallback.');
  }

  console.log('[Dev Services] All required backing services are ready. Launching backend server...\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(`[Dev Services] Unexpected error: ${err.message}`);
  process.exit(1);
});

