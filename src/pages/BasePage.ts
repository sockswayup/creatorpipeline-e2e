import { Page, Locator } from '@playwright/test';

/**
 * Base page class with common selectors and wait helpers.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for network to be idle (no pending requests).
   */
  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for an element to be visible.
   */
  async waitForVisible(locator: Locator, timeout = 5000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for an element to be hidden.
   */
  async waitForHidden(locator: Locator, timeout = 5000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click and wait for navigation.
   */
  async clickAndWait(locator: Locator): Promise<void> {
    await locator.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Fill input and blur to trigger validation.
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
    await locator.blur();
  }

  /**
   * Get toast/notification message if present.
   */
  async getToastMessage(): Promise<string | null> {
    const toast = this.page.locator('[role="alert"], .toast, .notification');
    if (await toast.isVisible()) {
      return toast.textContent();
    }
    return null;
  }
}
