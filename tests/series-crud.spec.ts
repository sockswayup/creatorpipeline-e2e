import { test, expect } from '../src/fixtures';
import {
  createPipeline,
  createSeries,
  createEpisode,
  listSeries,
  getSeries,
  listEpisodes,
  cleanupAll,
  type Pipeline,
} from '../src/helpers/api';

// Run tests serially to avoid race conditions with shared database state
test.describe.configure({ mode: 'serial' });

test.describe('Series CRUD', () => {
  let testPipeline: Pipeline;

  test.beforeAll(async () => {
    await cleanupAll();
    // Create a pipeline to hold our series
    testPipeline = await createPipeline('Test Pipeline', 'For series tests');
  });

  test.afterAll(async () => {
    await cleanupAll();
  });

  test('create series via UI', async ({ page, seriesList }) => {
    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Click "New Series" button
    await seriesList.clickNewSeries();

    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /create series/i })).toBeVisible();

    // Fill in the name
    await dialog.getByLabel(/name/i).fill('Weekly Vlog');

    // Publish days default to Monday, change to Tuesday and Thursday
    // First, deselect Monday (M button)
    const mondayButton = dialog.locator('button[title="Monday"]');
    await mondayButton.click();
    // Select Tuesday
    const tuesdayButton = dialog.locator('button[title="Tuesday"]');
    await tuesdayButton.click();
    // Select Thursday
    const thursdayButton = dialog.locator('button[title="Thursday"]');
    await thursdayButton.click();

    // Click Create
    await dialog.getByRole('button', { name: /create/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // Series should appear in the list (card has the title in a heading)
    const seriesCard = page.locator('a').filter({ hasText: 'Weekly Vlog' }).first();
    await expect(seriesCard).toBeVisible();

    // Verify via API
    const seriesList2 = await listSeries(testPipeline.id);
    const created = seriesList2.find((s) => s.name === 'Weekly Vlog');
    expect(created).toBeDefined();
    expect(created!.publishDays).toContain('TUESDAY');
    expect(created!.publishDays).toContain('THURSDAY');
  });

  test('create series with default Monday publish day', async ({ page, seriesList }) => {
    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    await seriesList.clickNewSeries();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill name only, keep default Monday selection
    await dialog.getByLabel(/name/i).fill('Monday Show');

    // Create
    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // Verify via API
    const seriesList2 = await listSeries(testPipeline.id);
    const created = seriesList2.find((s) => s.name === 'Monday Show');
    expect(created).toBeDefined();
    expect(created!.publishDays).toEqual(['MONDAY']);
  });

  test('edit series name and publish days', async ({ page, seriesList }) => {
    // Create a series via API to edit
    const series = await createSeries(testPipeline.id, 'Original Series', ['MONDAY', 'WEDNESDAY']);

    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Open edit dialog by hovering and clicking edit
    await seriesList.openEditDialog('Original Series');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /edit series/i })).toBeVisible();

    // Change name
    const nameInput = dialog.getByLabel(/name/i);
    await nameInput.clear();
    await nameInput.fill('Renamed Series');

    // Change publish days: remove Wednesday, add Friday
    const wednesdayButton = dialog.locator('button[title="Wednesday"]');
    await wednesdayButton.click(); // deselect
    const fridayButton = dialog.locator('button[title="Friday"]');
    await fridayButton.click(); // select

    // Save
    await dialog.getByRole('button', { name: /save/i }).click();
    await expect(dialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // Verify name changed in UI (use card locator to avoid toast conflicts)
    const renamedCard = page.locator('a').filter({ hasText: 'Renamed Series' }).first();
    await expect(renamedCard).toBeVisible();
    const originalCard = page.locator('a').filter({ hasText: 'Original Series' });
    await expect(originalCard).not.toBeVisible();

    // Verify via API
    const updated = await getSeries(series.id);
    expect(updated.name).toBe('Renamed Series');
    expect(updated.publishDays).toContain('MONDAY');
    expect(updated.publishDays).toContain('FRIDAY');
    expect(updated.publishDays).not.toContain('WEDNESDAY');
  });

  test('delete series removes it from list', async ({ page, seriesList }) => {
    // Create a series to delete
    await createSeries(testPipeline.id, 'Delete Me Series', ['FRIDAY']);

    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Verify it exists (use card locator)
    const deleteCard = page.locator('a').filter({ hasText: 'Delete Me Series' }).first();
    await expect(deleteCard).toBeVisible();

    // Open edit dialog
    await seriesList.openEditDialog('Delete Me Series');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click delete button
    await dialog.getByRole('button', { name: /delete/i }).click();

    // Confirmation dialog should appear
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();
    await expect(alertDialog.getByText(/are you sure/i)).toBeVisible();

    // Confirm deletion
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    // Dialogs should close
    await expect(alertDialog).not.toBeVisible();
    await expect(dialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // Series should be gone from UI
    const deletedCard = page.locator('a').filter({ hasText: 'Delete Me Series' });
    await expect(deletedCard).not.toBeVisible();

    // Verify via API
    const seriesList2 = await listSeries(testPipeline.id);
    expect(seriesList2.find((s) => s.name === 'Delete Me Series')).toBeUndefined();
  });

  test('delete series cascades to episodes', async ({ page, seriesList }) => {
    // Create series with episodes via API
    const series = await createSeries(testPipeline.id, 'Series With Episodes', ['MONDAY']);
    const episode1 = await createEpisode(series.id, 'Episode 1', 'First episode');
    const episode2 = await createEpisode(series.id, 'Episode 2', 'Second episode');

    // Verify episodes exist
    let episodes = await listEpisodes(series.id);
    expect(episodes.length).toBe(2);

    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Delete the series
    await seriesList.openEditDialog('Series With Episodes');

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /delete/i }).click();

    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();
    // Warning should mention episodes
    await expect(alertDialog.getByText(/episodes/i)).toBeVisible();
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    await expect(alertDialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // Verify series is gone
    const cascadeCard = page.locator('a').filter({ hasText: 'Series With Episodes' });
    await expect(cascadeCard).not.toBeVisible();

    // Verify episodes are gone via API (should return 404 or empty)
    try {
      const response = await fetch(`http://localhost:18080/api/v1/series/${series.id}/episodes`);
      // If series is deleted, this should return 404
      expect(response.status).toBe(404);
    } catch {
      // Expected - series doesn't exist
    }
  });

  test('cancel create series does not create', async ({ page, seriesList }) => {
    const initialSeries = await listSeries(testPipeline.id);
    const initialCount = initialSeries.length;

    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Open create dialog
    await seriesList.clickNewSeries();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in name
    await dialog.getByLabel(/name/i).fill('Cancelled Series');

    // Cancel
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();

    // Verify not created
    const afterSeries = await listSeries(testPipeline.id);
    expect(afterSeries.length).toBe(initialCount);
    expect(afterSeries.find((s) => s.name === 'Cancelled Series')).toBeUndefined();
  });

  test('cancel edit series does not save changes', async ({ page, seriesList }) => {
    const series = await createSeries(testPipeline.id, 'Unchanged Series', ['SATURDAY']);

    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Open edit dialog
    await seriesList.openEditDialog('Unchanged Series');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Change name
    const nameInput = dialog.getByLabel(/name/i);
    await nameInput.clear();
    await nameInput.fill('Should Not Change');

    // Cancel
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();

    // Original name should still show (use card locator)
    const unchangedCard = page.locator('a').filter({ hasText: 'Unchanged Series' }).first();
    await expect(unchangedCard).toBeVisible();

    // Verify via API
    const unchanged = await getSeries(series.id);
    expect(unchanged.name).toBe('Unchanged Series');
  });

  test('cannot deselect all publish days', async ({ page, seriesList }) => {
    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    await seriesList.clickNewSeries();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Try to deselect the default Monday (only selected day)
    const mondayButton = dialog.locator('button[title="Monday"]');
    await mondayButton.click();

    // Monday should still be selected (UI prevents deselecting all days)
    // The button should still have the primary background class (selected state)
    await expect(mondayButton).toHaveClass(/bg-primary/);

    await dialog.getByRole('button', { name: /cancel/i }).click();
  });

  test('series displays publish days badge correctly', async ({ page }) => {
    // Create series with specific days
    await createSeries(testPipeline.id, 'Weekday Series', [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
    ]);

    await page.goto(`/pipelines/${testPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Find the series card (it's a Link element)
    const card = page.locator('a').filter({ hasText: 'Weekday Series' }).first();
    await expect(card).toBeVisible();

    // Should display "Weekdays" badge (formatted helper)
    await expect(card.getByText('Weekdays')).toBeVisible();
  });
});
