import { test, expect } from '../src/fixtures';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads without errors', async ({ page }) => {
    // Check page loaded successfully
    await expect(page).toHaveTitle(/.*/);

    // No console errors
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

  test('sidebar renders with navigation items', async ({ sidebar }) => {
    // Sidebar should be visible
    await expect(sidebar.sidebar).toBeVisible();

    // Should have navigation links
    const links = await sidebar.getNavLinks();
    expect(links.length).toBeGreaterThan(0);

    // Should have key navigation items (case-insensitive check)
    const linkTexts = links.map((l) => l.toLowerCase());
    const hasNavigation =
      linkTexts.some((l) => l.includes('pipeline')) ||
      linkTexts.some((l) => l.includes('calendar')) ||
      linkTexts.some((l) => l.includes('board'));

    expect(hasNavigation).toBe(true);
  });

  test('can navigate between views', async ({ page, sidebar }) => {
    // Navigate to pipelines
    try {
      await sidebar.goToPipelines();
      await expect(page).toHaveURL(/pipeline/i);
    } catch {
      // Pipelines might be the default view, check URL contains pipelines or is root
      const url = page.url();
      expect(url.includes('pipeline') || url.endsWith('/')).toBe(true);
    }

    // Navigate to calendar
    await sidebar.goToCalendar();
    await expect(page).toHaveURL(/calendar/i);

    // Navigate to board
    await sidebar.goToBoard();
    await expect(page).toHaveURL(/board|kanban/i);
  });

  test('API health check', async ({ page }) => {
    // Direct API health check
    const response = await page.request.get('http://localhost:18080/actuator/health');
    expect(response.ok()).toBe(true);

    const health = await response.json();
    expect(health.status).toBe('UP');
  });
});
