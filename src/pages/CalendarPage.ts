import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Calendar view interactions.
 */
export class CalendarPage extends BasePage {
  readonly calendar: Locator;
  readonly prevMonthBtn: Locator;
  readonly nextMonthBtn: Locator;
  readonly todayBtn: Locator;
  readonly monthTitle: Locator;
  readonly events: Locator;

  constructor(page: Page) {
    super(page);
    this.calendar = page.locator('[data-testid="calendar"], .calendar, .fc');
    this.prevMonthBtn = page.getByRole('button', { name: /prev|back|←/i });
    this.nextMonthBtn = page.getByRole('button', { name: /next|forward|→/i });
    this.todayBtn = page.getByRole('button', { name: /today/i });
    this.monthTitle = page.locator('[data-testid="calendar-title"], .fc-toolbar-title, .calendar-title');
    this.events = page.locator('[data-testid="calendar-event"], .fc-event, .calendar-event');
  }

  /**
   * Navigate to the calendar page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/calendar');
    await this.waitForNetworkIdle();
  }

  /**
   * Navigate to previous month.
   */
  async previousMonth(): Promise<void> {
    await this.clickAndWait(this.prevMonthBtn);
  }

  /**
   * Navigate to next month.
   */
  async nextMonth(): Promise<void> {
    await this.clickAndWait(this.nextMonthBtn);
  }

  /**
   * Go to today's view.
   */
  async goToToday(): Promise<void> {
    await this.clickAndWait(this.todayBtn);
  }

  /**
   * Get current month/year title.
   */
  async getMonthTitle(): Promise<string> {
    return (await this.monthTitle.textContent()) || '';
  }

  /**
   * Get event by episode title.
   */
  getEvent(title: string): Locator {
    return this.page.locator(`[data-testid="calendar-event"]:has-text("${title}"), .fc-event:has-text("${title}"), .calendar-event:has-text("${title}")`);
  }

  /**
   * Click on an event to open details.
   */
  async clickEvent(title: string): Promise<void> {
    const event = this.getEvent(title);
    await this.clickAndWait(event);
  }

  /**
   * Drag an event to a different date.
   */
  async dragEventToDate(title: string, targetDate: string): Promise<void> {
    const event = this.getEvent(title);
    const targetCell = this.page.locator(`[data-date="${targetDate}"], td[data-date="${targetDate}"]`);

    await event.dragTo(targetCell);
    await this.waitForNetworkIdle();
  }

  /**
   * Get all visible events.
   */
  async getAllEventTitles(): Promise<string[]> {
    return this.events.allTextContents();
  }

  /**
   * Count total visible events.
   */
  async getEventCount(): Promise<number> {
    return this.events.count();
  }

  /**
   * Check if an event exists on the calendar.
   */
  async eventExists(title: string): Promise<boolean> {
    return this.getEvent(title).isVisible();
  }

  /**
   * Click on a specific date cell.
   */
  async clickDate(date: string): Promise<void> {
    const cell = this.page.locator(`[data-date="${date}"], td[data-date="${date}"]`);
    await this.clickAndWait(cell);
  }
}
