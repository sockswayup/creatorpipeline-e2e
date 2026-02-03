import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for modal dialogs (create, edit, delete confirm).
 */
export class DialogPage extends BasePage {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dialog = page.getByRole('dialog');
    this.title = this.dialog.locator('h1, h2, h3, [class*="title"]').first();
    this.nameInput = this.dialog.getByLabel(/name/i);
    this.descriptionInput = this.dialog.getByLabel(/description/i);
    this.saveButton = this.dialog.getByRole('button', { name: /save|submit|create/i });
    this.cancelButton = this.dialog.getByRole('button', { name: /cancel/i });
    this.confirmButton = this.dialog.getByRole('button', { name: /confirm|yes|delete/i });
    this.closeButton = this.dialog.getByRole('button', { name: /close/i });
  }

  /**
   * Wait for dialog to be visible.
   */
  async waitForOpen(): Promise<void> {
    await this.waitForVisible(this.dialog);
  }

  /**
   * Wait for dialog to close.
   */
  async waitForClose(): Promise<void> {
    await this.waitForHidden(this.dialog);
  }

  /**
   * Check if dialog is open.
   */
  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  /**
   * Fill the name field.
   */
  async fillName(name: string): Promise<void> {
    await this.fillInput(this.nameInput, name);
  }

  /**
   * Fill the description field.
   */
  async fillDescription(description: string): Promise<void> {
    await this.fillInput(this.descriptionInput, description);
  }

  /**
   * Click save/submit button and wait for dialog to close.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    await this.waitForClose();
    await this.waitForNetworkIdle();
  }

  /**
   * Click cancel button and wait for dialog to close.
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForClose();
  }

  /**
   * Confirm a deletion dialog.
   */
  async confirmDelete(): Promise<void> {
    await this.confirmButton.click();
    await this.waitForClose();
    await this.waitForNetworkIdle();
  }

  /**
   * Get dialog title text.
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  /**
   * Fill and save a create/edit form.
   */
  async fillAndSave(data: { name?: string; description?: string }): Promise<void> {
    if (data.name) {
      await this.fillName(data.name);
    }
    if (data.description) {
      await this.fillDescription(data.description);
    }
    await this.save();
  }
}
