import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown: Collect coverage and stop Docker Compose.
 */
async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Tearing down E2E test environment...\n');

  const composeFile = 'docker-compose.test.yml';
  const projectDir = process.cwd();
  const coverageDir = path.join(projectDir, 'coverage', 'backend');

  // Ensure coverage directory exists
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  try {
    // Collect JaCoCo coverage before stopping containers
    console.log('📥 Collecting JaCoCo coverage from API container...');
    try {
      // Dump coverage via TCP using jacococli inside the container
      execSync(
        'docker exec e2e-creatorpipeline-api java -jar /jacoco/jacococli.jar dump ' +
        '--address localhost --port 6300 --destfile /tmp/jacoco.exec',
        { cwd: projectDir, stdio: 'pipe' }
      );

      // Copy the exec file out of the container
      execSync(
        `docker cp e2e-creatorpipeline-api:/tmp/jacoco.exec ${coverageDir}/jacoco.exec`,
        { cwd: projectDir, stdio: 'pipe' }
      );

      // Copy jacococli.jar for report generation (before container stops)
      execSync(
        'docker cp e2e-creatorpipeline-api:/jacoco/jacococli.jar /tmp/jacococli.jar',
        { cwd: projectDir, stdio: 'pipe' }
      );

      console.log(`✅ JaCoCo coverage saved to ${coverageDir}/jacoco.exec`);
    } catch (coverageError) {
      console.log('⚠️  Could not collect JaCoCo coverage (container may have stopped)');
    }

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
