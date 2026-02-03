import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for sidebar navigation.
 */
export class SidebarNav extends BasePage {
  readonly sidebar: Locator;
  readonly pipelinesLink: Locator;
  readonly calendarLink: Locator;
  readonly boardLink: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = page.locator('[data-testid="sidebar"], nav, aside').first();
    this.pipelinesLink = page.getByRole('link', { name: /pipelines?/i });
    this.calendarLink = page.getByRole('link', { name: /calendar/i });
    this.boardLink = page.getByRole('link', { name: /board|kanban/i });
  }

  /**
   * Navigate to Pipelines view.
   */
  async goToPipelines(): Promise<void> {
    await this.clickAndWait(this.pipelinesLink);
    await expect(this.page).toHaveURL(/.*pipelines?.*/i);
  }

  /**
   * Navigate to Calendar view.
   */
  async goToCalendar(): Promise<void> {
    await this.clickAndWait(this.calendarLink);
    await expect(this.page).toHaveURL(/.*calendar.*/i);
  }

  /**
   * Navigate to Board/Kanban view.
   */
  async goToBoard(): Promise<void> {
    await this.clickAndWait(this.boardLink);
    await expect(this.page).toHaveURL(/.*board|kanban.*/i);
  }

  /**
   * Check if sidebar is visible and rendered.
   */
  async isVisible(): Promise<boolean> {
    return this.sidebar.isVisible();
  }

  /**
   * Get all navigation links.
   */
  async getNavLinks(): Promise<string[]> {
    const links = await this.page.locator('nav a, aside a').allTextContents();
    return links.filter((text) => text.trim().length > 0);
  }
}
