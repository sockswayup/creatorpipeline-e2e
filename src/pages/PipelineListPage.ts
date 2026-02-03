import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Pipeline list and CRUD operations.
 */
export class PipelineListPage extends BasePage {
  readonly createButton: Locator;
  readonly pipelineCards: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.getByRole('button', { name: /create|add|new/i });
    this.pipelineCards = page.locator('[data-testid="pipeline-card"], .pipeline-card, .pipeline-item');
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  /**
   * Navigate to the pipelines page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/pipelines');
    await this.waitForNetworkIdle();
  }

  /**
   * Click the create pipeline button.
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  /**
   * Get pipeline card by name.
   */
  getPipelineByName(name: string): Locator {
    return this.page.locator(`[data-testid="pipeline-card"]:has-text("${name}"), .pipeline-card:has-text("${name}"), .pipeline-item:has-text("${name}")`);
  }

  /**
   * Click on a pipeline by name.
   */
  async selectPipeline(name: string): Promise<void> {
    const pipeline = this.getPipelineByName(name);
    await this.clickAndWait(pipeline);
  }

  /**
   * Click edit button for a pipeline.
   */
  async clickEdit(name: string): Promise<void> {
    const pipeline = this.getPipelineByName(name);
    const editBtn = pipeline.getByRole('button', { name: /edit/i });
    await editBtn.click();
  }

  /**
   * Click delete button for a pipeline.
   */
  async clickDelete(name: string): Promise<void> {
    const pipeline = this.getPipelineByName(name);
    const deleteBtn = pipeline.getByRole('button', { name: /delete/i });
    await deleteBtn.click();
  }

  /**
   * Get count of visible pipelines.
   */
  async getPipelineCount(): Promise<number> {
    return this.pipelineCards.count();
  }

  /**
   * Check if a pipeline exists by name.
   */
  async pipelineExists(name: string): Promise<boolean> {
    return this.getPipelineByName(name).isVisible();
  }
}
