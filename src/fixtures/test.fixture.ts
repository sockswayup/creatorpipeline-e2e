import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupAll } from '../helpers/api';
import {
  SidebarNav,
  PipelineListPage,
  DialogPage,
  BoardPage,
  CalendarPage,
} from '../pages';

// Coverage directory setup
const coverageDir = path.join(process.cwd(), 'coverage', 'v8');
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

/**
 * Extended test fixture with page objects and V8 coverage collection.
 */
type TestFixtures = {
  sidebar: SidebarNav;
  pipelineList: PipelineListPage;
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

    // Stop and save coverage
    const coverage = await page.coverage.stopJSCoverage();

    // Filter to app code only
    const appCoverage = coverage.filter((entry) => {
      return (
        entry.url.includes('localhost:13000') &&
        !entry.url.includes('node_modules')
      );
    });

    // Save coverage data
    if (appCoverage.length > 0) {
      const testName = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const coverageFile = path.join(coverageDir, `${testName}-${testInfo.workerIndex}.json`);
      fs.writeFileSync(coverageFile, JSON.stringify(appCoverage, null, 2));
    }
  },

  // Page objects
  sidebar: async ({ page }, use) => {
    await use(new SidebarNav(page));
  },

  pipelineList: async ({ page }, use) => {
    await use(new PipelineListPage(page));
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
