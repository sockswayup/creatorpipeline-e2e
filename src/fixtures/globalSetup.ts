import { execSync } from 'child_process';
import { waitForApi } from '../helpers/api';

/**
 * Global setup: Start Docker Compose and wait for services.
 */
async function globalSetup(): Promise<void> {
  console.log('\n🚀 Starting E2E test environment...\n');

  const composeFile = 'docker-compose.test.yml';
  const projectDir = process.cwd();

  try {
    // Build and start services
    console.log('📦 Building Docker images...');
    execSync(`docker compose -f ${composeFile} build`, {
      cwd: projectDir,
      stdio: 'inherit',
    });

    console.log('🐳 Starting Docker Compose services...');
    execSync(`docker compose -f ${composeFile} up -d`, {
      cwd: projectDir,
      stdio: 'inherit',
    });

    // Wait for API to be healthy
    console.log('⏳ Waiting for API to be healthy...');
    const apiReady = await waitForApi(60, 2000); // 60 attempts, 2s each = 2 min max

    if (!apiReady) {
      throw new Error('API failed to become healthy within timeout');
    }

    console.log('✅ E2E test environment ready!\n');
  } catch (error) {
    console.error('❌ Failed to start E2E test environment:', error);

    // Attempt cleanup on failure
    try {
      execSync(`docker compose -f ${composeFile} down -v`, {
        cwd: projectDir,
        stdio: 'inherit',
      });
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}

export default globalSetup;
