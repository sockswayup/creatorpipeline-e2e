import { test, expect } from '../src/fixtures';
import { createPipeline, cleanupAll, type Pipeline } from '../src/helpers/api';

let testPipeline: Pipeline;

// Run smoke tests serially to avoid conflicts with other test files
test.describe.configure({ mode: 'serial' });

test.describe('Smoke Tests', () => {
  test.beforeAll(async () => {
    // Clean up any existing data first
    await cleanupAll();
    // Seed a default pipeline for tests
    try {
      testPipeline = await createPipeline('Test Pipeline', 'E2E smoke test pipeline');
      console.log('Created test pipeline:', testPipeline.id);
    } catch (error) {
      console.error('Failed to create pipeline:', error);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Cleanup test data
    await cleanupAll();
  });

  test('app loads without errors', async ({ page }) => {
    // Navigate directly to the test pipeline's series page
    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Check page loaded successfully
    await expect(page).toHaveURL(/.*\/pipelines\/\d+\/series.*/);

    // Verify no critical console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for app to render
    await page.waitForLoadState('networkidle');

    // Filter out expected/benign errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('sidebar renders with navigation items', async ({ page, sidebar }) => {
    // Navigate directly to the test pipeline
    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible (desktop view)
    await expect(sidebar.sidebar).toBeVisible();

    // Should have navigation links
    const links = await sidebar.getNavLinks();
    expect(links.length).toBeGreaterThan(0);
  });

  test('can navigate between views', async ({ page, sidebar }) => {
    // Start at the test pipeline's series page
    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/pipelines\/\d+\/series.*/);

    // Navigate to board view
    await sidebar.goToBoard();
    await expect(page).toHaveURL(/.*\/board.*/);

    // Navigate to calendar view
    await sidebar.goToCalendar();
    await expect(page).toHaveURL(/.*\/calendar.*/);
  });

  test('API health check', async ({ page }) => {
    // Direct API health check
    const response = await page.request.get('http://localhost:18080/actuator/health');
    expect(response.ok()).toBe(true);

    const health = await response.json();
    expect(health.status).toBe('UP');
  });
});
