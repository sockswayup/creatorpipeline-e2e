import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for sidebar navigation.
 *
 * URL Structure: /pipelines/:pipelineId/series | /board | /calendar
 */
export class SidebarNav extends BasePage {
  readonly sidebar: Locator;
  readonly calendarLink: Locator;
  readonly boardLink: Locator;

  constructor(page: Page) {
    super(page);
    // Sidebar is an <aside> element inside the layout
    this.sidebar = page.locator('aside');
    // Navigation links use specific text
    this.calendarLink = page.getByRole('link', { name: /content calendar/i });
    this.boardLink = page.getByRole('link', { name: /board view/i });
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
    await expect(this.page).toHaveURL(/.*board.*/i);
  }

  /**
   * Click on a pipeline by name to navigate to its series list.
   */
  async goToPipeline(name: string): Promise<void> {
    const pipelineLink = this.page.getByRole('link', { name });
    await this.clickAndWait(pipelineLink);
    await expect(this.page).toHaveURL(/.*\/pipelines\/\d+\/series.*/i);
  }

  /**
   * Check if sidebar is visible and rendered.
   */
  async isVisible(): Promise<boolean> {
    return this.sidebar.isVisible();
  }

  /**
   * Get all navigation links in the sidebar.
   */
  async getNavLinks(): Promise<string[]> {
    const links = await this.sidebar.locator('a').allTextContents();
    return links.filter((text) => text.trim().length > 0);
  }

  /**
   * Check if pipeline exists in sidebar.
   */
  async hasPipeline(name: string): Promise<boolean> {
    return this.page.getByRole('link', { name }).isVisible();
  }
}
