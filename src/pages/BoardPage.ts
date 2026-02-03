import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Kanban board interactions.
 */
export class BoardPage extends BasePage {
  readonly board: Locator;
  readonly columns: Locator;
  readonly cards: Locator;

  constructor(page: Page) {
    super(page);
    this.board = page.locator('[data-testid="kanban-board"], .kanban-board, .board');
    this.columns = page.locator('[data-testid="kanban-column"], .kanban-column, .board-column');
    this.cards = page.locator('[data-testid="kanban-card"], .kanban-card, .board-card, .episode-card');
  }

  /**
   * Navigate to the board page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/board');
    await this.waitForNetworkIdle();
  }

  /**
   * Get column by status name.
   */
  getColumn(status: string): Locator {
    return this.page.locator(`[data-testid="kanban-column-${status.toLowerCase()}"], [data-status="${status}"], .kanban-column:has-text("${status}")`);
  }

  /**
   * Get card by episode title.
   */
  getCard(title: string): Locator {
    return this.page.locator(`[data-testid="kanban-card"]:has-text("${title}"), .kanban-card:has-text("${title}"), .episode-card:has-text("${title}")`);
  }

  /**
   * Get cards in a specific column.
   */
  getCardsInColumn(status: string): Locator {
    return this.getColumn(status).locator('[data-testid="kanban-card"], .kanban-card, .episode-card');
  }

  /**
   * Drag a card to a different column.
   */
  async dragCardToColumn(cardTitle: string, targetStatus: string): Promise<void> {
    const card = this.getCard(cardTitle);
    const targetColumn = this.getColumn(targetStatus);

    await card.dragTo(targetColumn);
    await this.waitForNetworkIdle();
  }

  /**
   * Click on a card to open details.
   */
  async clickCard(title: string): Promise<void> {
    const card = this.getCard(title);
    await this.clickAndWait(card);
  }

  /**
   * Get all column names.
   */
  async getColumnNames(): Promise<string[]> {
    const headers = this.columns.locator('h2, h3, [class*="header"], [class*="title"]');
    return headers.allTextContents();
  }

  /**
   * Count cards in a column.
   */
  async getCardCountInColumn(status: string): Promise<number> {
    return this.getCardsInColumn(status).count();
  }

  /**
   * Check if a card exists.
   */
  async cardExists(title: string): Promise<boolean> {
    return this.getCard(title).isVisible();
  }
}
