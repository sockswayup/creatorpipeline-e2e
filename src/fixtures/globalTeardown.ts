import { execSync } from 'child_process';

/**
 * Global teardown: Stop Docker Compose and collect coverage.
 */
async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Tearing down E2E test environment...\n');

  const composeFile = 'docker-compose.test.yml';
  const projectDir = process.cwd();

  try {
    // TODO: Collect JaCoCo coverage from API container before teardown
    // This would involve connecting to port 6300 and dumping coverage data
    // For now, we just tear down

    console.log('🐳 Stopping Docker Compose services...');
    execSync(`docker compose -f ${composeFile} down -v`, {
      cwd: projectDir,
      stdio: 'inherit',
    });

    console.log('✅ E2E test environment cleaned up!\n');
  } catch (error) {
    console.error('⚠️ Warning: Teardown encountered issues:', error);
    // Don't throw - tests already completed
  }
}

export default globalTeardown;
