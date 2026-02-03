import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupAll } from '../helpers/api';
import {
  SidebarNav,
  PipelineListPage,
  SeriesListPage,
  DialogPage,
  BoardPage,
  CalendarPage,
} from '../pages';

// Coverage directory setup
const v8CoverageDir = path.join(process.cwd(), 'coverage', 'v8');
const istanbulCoverageDir = path.join(process.cwd(), 'coverage', 'istanbul');
if (!fs.existsSync(v8CoverageDir)) {
  fs.mkdirSync(v8CoverageDir, { recursive: true });
}
if (!fs.existsSync(istanbulCoverageDir)) {
  fs.mkdirSync(istanbulCoverageDir, { recursive: true });
}

/**
 * Extended test fixture with page objects and V8 coverage collection.
 */
type TestFixtures = {
  sidebar: SidebarNav;
  pipelineList: PipelineListPage;
  seriesList: SeriesListPage;
  dialog: DialogPage;
  board: BoardPage;
  calendar: CalendarPage;
};

export const test = base.extend<TestFixtures>({
  // Override page to collect coverage
  page: async ({ page }, use, testInfo) => {
    // Start JS coverage collection
    await page.coverage.startJSCoverage({ resetOnNavigation: false });

    // Run the test
    await use(page);

    // Stop and save V8 coverage
    const coverage = await page.coverage.stopJSCoverage();

    // Filter to app code only
    const appCoverage = coverage.filter((entry) => {
      return (
        entry.url.includes('localhost:13000') &&
        !entry.url.includes('node_modules')
      );
    });

    const testName = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    // Save V8 coverage data
    if (appCoverage.length > 0) {
      const coverageFile = path.join(v8CoverageDir, `${testName}-${testInfo.workerIndex}.json`);
      fs.writeFileSync(coverageFile, JSON.stringify(appCoverage, null, 2));
    }

    // Collect Istanbul coverage (from vite-plugin-istanbul instrumentation)
    try {
      const istanbulCoverage = await page.evaluate(() => {
        return (window as unknown as { __coverage__?: object }).__coverage__;
      });
      if (istanbulCoverage && Object.keys(istanbulCoverage).length > 0) {
        const istanbulFile = path.join(istanbulCoverageDir, `${testName}-${testInfo.workerIndex}.json`);
        fs.writeFileSync(istanbulFile, JSON.stringify(istanbulCoverage, null, 2));
      }
    } catch {
      // Istanbul coverage not available (instrumentation may not be enabled)
    }
  },

  // Page objects
  sidebar: async ({ page }, use) => {
    await use(new SidebarNav(page));
  },

  pipelineList: async ({ page }, use) => {
    await use(new PipelineListPage(page));
  },

  seriesList: async ({ page }, use) => {
    await use(new SeriesListPage(page));
  },

  dialog: async ({ page }, use) => {
    await use(new DialogPage(page));
  },

  board: async ({ page }, use) => {
    await use(new BoardPage(page));
  },

  calendar: async ({ page }, use) => {
    await use(new CalendarPage(page));
  },
});

/**
 * Test fixture with automatic cleanup after each test.
 */
export const testWithCleanup = test.extend({
  page: async ({ page }, use) => {
    // Run test
    await use(page);

    // Cleanup after test
    await cleanupAll();
  },
});

export { expect };
