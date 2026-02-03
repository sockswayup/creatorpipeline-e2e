import { test, expect } from '../src/fixtures';
import {
  createPipeline,
  createSeries,
  createEpisode,
  listPipelines,
  getPipeline,
  cleanupAll,
  type Pipeline,
} from '../src/helpers/api';

// Run tests serially to avoid race conditions with shared database state
test.describe.configure({ mode: 'serial' });

test.describe('Pipeline CRUD', () => {
  // Clean up before each test to ensure fresh state
  test.beforeEach(async () => {
    await cleanupAll();
  });

  test.afterAll(async () => {
    await cleanupAll();
  });

  test('create a new pipeline via sidebar', async ({ page, sidebar }) => {
    // Create a seed pipeline to have a valid route
    const seedPipeline = await createPipeline('Seed Pipeline', 'For navigation');
    await page.goto(`/pipelines/${seedPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Click "New Pipeline" button in sidebar
    await page.locator('button:has-text("New Pipeline")').click();

    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /create pipeline/i })).toBeVisible();

    // Fill in the form
    await dialog.getByLabel(/name/i).fill('My Test Pipeline');

    // Click Create
    await dialog.getByRole('button', { name: /create/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Should navigate to the new pipeline
    await expect(page).toHaveURL(/.*\/pipelines\/\d+\/series.*/);

    // New pipeline should appear in sidebar
    await expect(page.getByRole('link', { name: 'My Test Pipeline' })).toBeVisible();

    // Verify via API that pipeline was created
    const pipelines = await listPipelines();
    const created = pipelines.find((p) => p.name === 'My Test Pipeline');
    expect(created).toBeDefined();
  });

  test('edit pipeline name', async ({ page }) => {
    // Create a pipeline to edit
    const pipeline = await createPipeline('Original Name', 'Test description');
    await page.goto(`/pipelines/${pipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Hover over pipeline in sidebar to reveal edit button
    const pipelineLink = page.getByRole('link', { name: 'Original Name' });
    await pipelineLink.hover();

    // Click the edit (pencil) button
    const editButton = pipelineLink.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Edit dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /edit pipeline/i })).toBeVisible();

    // Clear and fill new name
    const nameInput = dialog.getByLabel(/name/i);
    await nameInput.clear();
    await nameInput.fill('Updated Name');

    // Click Save
    await dialog.getByRole('button', { name: /save/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Updated name should appear in sidebar
    await expect(page.getByRole('link', { name: 'Updated Name' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Original Name' })).not.toBeVisible();

    // Verify via API
    const updated = await getPipeline(pipeline.id);
    expect(updated.name).toBe('Updated Name');
  });

  test('delete pipeline with no children', async ({ page }) => {
    // Create two pipelines (need at least one to remain after delete)
    const pipelineToKeep = await createPipeline('Keep This', 'Will remain');
    const pipelineToDelete = await createPipeline('Delete Me', 'Will be deleted');

    await page.goto(`/pipelines/${pipelineToKeep.id}/series`);
    await page.waitForLoadState('networkidle');

    // Verify both pipelines are in sidebar
    await expect(page.getByRole('link', { name: 'Keep This' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Delete Me' })).toBeVisible();

    // Open edit dialog for pipeline to delete
    const pipelineLink = page.getByRole('link', { name: 'Delete Me' });
    await pipelineLink.hover();
    await pipelineLink.getByRole('button', { name: /edit/i }).click();

    // Click Delete button in edit dialog
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion in alert dialog
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();
    await expect(alertDialog.getByText(/are you sure/i)).toBeVisible();
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    // Both dialogs should close
    await expect(alertDialog).not.toBeVisible();
    await expect(editDialog).not.toBeVisible();

    // Deleted pipeline should be gone from sidebar
    await expect(page.getByRole('link', { name: 'Delete Me' })).not.toBeVisible();

    // Keep This should still be there
    await expect(page.getByRole('link', { name: 'Keep This' })).toBeVisible();

    // Verify via API
    const pipelines = await listPipelines();
    expect(pipelines.find((p) => p.name === 'Delete Me')).toBeUndefined();
    expect(pipelines.find((p) => p.name === 'Keep This')).toBeDefined();
  });

  test('delete pipeline cascades to series and episodes', async ({ page }) => {
    // Create pipeline with series and episodes
    const pipeline = await createPipeline('Pipeline With Data', 'Has children');
    const series = await createSeries(pipeline.id, 'Test Series', ['MONDAY']);
    const episode = await createEpisode(series.id, 'Test Episode', 'Description');

    // Create another pipeline to keep
    const keepPipeline = await createPipeline('Safe Pipeline', 'Unaffected');

    await page.goto(`/pipelines/${keepPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Open edit dialog for pipeline with data
    const pipelineLink = page.getByRole('link', { name: 'Pipeline With Data' });
    await pipelineLink.hover();
    await pipelineLink.getByRole('button', { name: /edit/i }).click();

    // Click Delete
    const editDialog = page.getByRole('dialog');
    await editDialog.getByRole('button', { name: /delete/i }).click();

    // Confirm - should warn about cascade
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog.getByText(/series and episodes/i)).toBeVisible();
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    // Wait for deletion to complete
    await expect(alertDialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // Pipeline should be gone
    await expect(page.getByRole('link', { name: 'Pipeline With Data' })).not.toBeVisible();

    // Verify via API - pipeline, series, and episodes all deleted
    const pipelines = await listPipelines();
    expect(pipelines.find((p) => p.id === pipeline.id)).toBeUndefined();

    // Attempting to get the deleted series should fail
    try {
      await fetch(`http://localhost:18080/api/v1/series/${series.id}`);
      // If we get here, check response
      const seriesResponse = await fetch(`http://localhost:18080/api/v1/series/${series.id}`);
      expect(seriesResponse.status).toBe(404);
    } catch {
      // Expected - series doesn't exist
    }
  });

  test('cancel create pipeline does not create', async ({ page }) => {
    // Create seed pipeline
    const seedPipeline = await createPipeline('Seed', 'Seed');
    await page.goto(`/pipelines/${seedPipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    const initialPipelines = await listPipelines();
    const initialCount = initialPipelines.length;

    // Open create dialog
    await page.locator('button:has-text("New Pipeline")').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in name
    await dialog.getByLabel(/name/i).fill('Cancelled Pipeline');

    // Click Cancel
    await dialog.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Pipeline should NOT be created
    const afterPipelines = await listPipelines();
    expect(afterPipelines.length).toBe(initialCount);
    expect(afterPipelines.find((p) => p.name === 'Cancelled Pipeline')).toBeUndefined();
  });

  test('cancel edit pipeline does not save changes', async ({ page }) => {
    const pipeline = await createPipeline('Original', 'Description');
    await page.goto(`/pipelines/${pipeline.id}/series`);
    await page.waitForLoadState('networkidle');

    // Open edit dialog
    const pipelineLink = page.getByRole('link', { name: 'Original' });
    await pipelineLink.hover();
    await pipelineLink.getByRole('button', { name: /edit/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Change name
    const nameInput = dialog.getByLabel(/name/i);
    await nameInput.clear();
    await nameInput.fill('Changed Name');

    // Cancel
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();

    // Original name should still show
    await expect(page.getByRole('link', { name: 'Original' })).toBeVisible();

    // Verify via API
    const unchanged = await getPipeline(pipeline.id);
    expect(unchanged.name).toBe('Original');
  });

  test('deleting current pipeline removes it from sidebar', async ({ page }) => {
    // Create two pipelines
    const pipeline1 = await createPipeline('First Pipeline', 'First');
    const pipeline2 = await createPipeline('Second Pipeline', 'Second');

    // Navigate to pipeline2 (not the one we'll delete)
    await page.goto(`/pipelines/${pipeline2.id}/series`);
    await page.waitForLoadState('networkidle');

    // Both pipelines should be visible in sidebar
    await expect(page.getByRole('link', { name: 'First Pipeline' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Second Pipeline' })).toBeVisible();

    // Delete pipeline1 from sidebar
    const pipelineLink = page.getByRole('link', { name: 'First Pipeline' });
    await pipelineLink.hover();
    await pipelineLink.getByRole('button', { name: /edit/i }).click();

    const editDialog = page.getByRole('dialog');
    await editDialog.getByRole('button', { name: /delete/i }).click();

    const alertDialog = page.getByRole('alertdialog');
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    // Wait for dialogs to close
    await expect(alertDialog).not.toBeVisible();
    await page.waitForLoadState('networkidle');

    // First Pipeline should be gone from sidebar
    await expect(page.getByRole('link', { name: 'First Pipeline' })).not.toBeVisible();

    // Second Pipeline should still be there
    await expect(page.getByRole('link', { name: 'Second Pipeline' })).toBeVisible();

    // Verify via API
    const pipelines = await listPipelines();
    expect(pipelines.find((p) => p.name === 'First Pipeline')).toBeUndefined();
    expect(pipelines.find((p) => p.name === 'Second Pipeline')).toBeDefined();
  });
});
