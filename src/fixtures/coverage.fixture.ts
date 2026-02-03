import { test as base } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import v8toIstanbul from 'v8-to-istanbul';

const coverageDir = path.join(process.cwd(), 'coverage');
const v8CoverageDir = path.join(coverageDir, 'v8');

// Ensure coverage directories exist
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}
if (!fs.existsSync(v8CoverageDir)) {
  fs.mkdirSync(v8CoverageDir, { recursive: true });
}

/**
 * Test fixture that collects V8 code coverage for frontend.
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // Start collecting JS coverage
    await page.coverage.startJSCoverage({
      resetOnNavigation: false,
    });

    // Run the test
    await use(page);

    // Stop and get coverage
    const coverage = await page.coverage.stopJSCoverage();

    // Filter to only include app code (not node_modules or external)
    const appCoverage = coverage.filter((entry) => {
      const url = entry.url;
      return (
        url.includes('localhost:13000') &&
        !url.includes('node_modules') &&
        !url.includes('chunk-') && // Skip vendor chunks
        (url.endsWith('.js') || url.endsWith('.tsx') || url.endsWith('.ts'))
      );
    });

    // Save raw V8 coverage for this test
    const testName = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const coverageFile = path.join(v8CoverageDir, `${testName}-${testInfo.workerIndex}.json`);
    fs.writeFileSync(coverageFile, JSON.stringify(appCoverage, null, 2));
  },
});

export { expect } from '@playwright/test';
