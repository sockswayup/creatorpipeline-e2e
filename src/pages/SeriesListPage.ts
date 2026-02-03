import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Series list view at /pipelines/:pipelineId/series.
 */
export class SeriesListPage extends BasePage {
  readonly newSeriesButton: Locator;
  readonly createFirstSeriesButton: Locator;
  readonly seriesGrid: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    // Button when series exist
    this.newSeriesButton = page.getByRole('button', { name: /new series/i });
    // Button in empty state
    this.createFirstSeriesButton = page.getByRole('button', { name: /create your first series/i });
    this.seriesGrid = page.locator('.grid');
    this.emptyState = page.getByText(/no series yet/i);
  }

  /**
   * Click the appropriate button to open create dialog (handles empty state).
   */
  async clickNewSeries(): Promise<void> {
    // Try the empty state button first, fall back to the regular button
    if (await this.createFirstSeriesButton.isVisible()) {
      await this.createFirstSeriesButton.click();
    } else {
      await this.newSeriesButton.click();
    }
  }

  /**
   * Get a series card by name.
   * The card structure is a Link containing a Card component.
   */
  getSeriesCard(name: string): Locator {
    // Cards are wrapped in a link, find the card by its title text
    return this.page.locator('a').filter({ hasText: name }).first();
  }

  /**
   * Get all series card names visible on the page.
   */
  async getSeriesNames(): Promise<string[]> {
    // Series names are in CardTitle elements
    const titles = this.page.locator('[class*="CardTitle"], h3').filter({
      has: this.page.locator('text'),
    });
    const count = await titles.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await titles.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  /**
   * Click on a series card to navigate to its episodes.
   */
  async clickSeries(name: string): Promise<void> {
    const card = this.getSeriesCard(name);
    await this.clickAndWait(card);
  }

  /**
   * Hover over a series card and click the edit button.
   */
  async openEditDialog(name: string): Promise<void> {
    const card = this.getSeriesCard(name);
    await card.hover();
    // Edit button has title="Edit series" and appears on hover
    const editButton = card.locator('button[title="Edit series"]');
    await editButton.click();
  }

  /**
   * Check if a series exists in the list.
   */
  async hasSeries(name: string): Promise<boolean> {
    const card = this.getSeriesCard(name);
    return card.isVisible();
  }

  /**
   * Get the publish days badge text for a series.
   */
  async getSeriesPublishDays(name: string): Promise<string> {
    const card = this.getSeriesCard(name);
    const badge = card.locator('.rounded-full, [class*="badge"]').first();
    return (await badge.textContent()) || '';
  }

  /**
   * Get the episode count for a series.
   */
  async getSeriesEpisodeCount(name: string): Promise<string> {
    const card = this.getSeriesCard(name);
    const count = card.getByText(/\d+ episode/i);
    return (await count.textContent()) || '';
  }
}
