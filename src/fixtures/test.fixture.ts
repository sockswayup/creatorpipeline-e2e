import { test as base, expect } from '@playwright/test';
import { cleanupAll } from '../helpers/api';
import {
  SidebarNav,
  PipelineListPage,
  DialogPage,
  BoardPage,
  CalendarPage,
} from '../pages';

/**
 * Extended test fixture with page objects and cleanup.
 */
type TestFixtures = {
  sidebar: SidebarNav;
  pipelineList: PipelineListPage;
  dialog: DialogPage;
  board: BoardPage;
  calendar: CalendarPage;
};

export const test = base.extend<TestFixtures>({
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
