import { Page, Locator, expect } from "@playwright/test";

export class NotificationsPage {
  readonly page: Page;
  readonly list: Locator;
  readonly listItems: Locator;
  readonly markReadButtons: Locator;
  readonly emptyListHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    this.list = page.getByTestId("notification-list");
    this.listItems = page.locator('[data-test*="notification-list-item"]');
    this.markReadButtons = page.locator('[data-test*="notification-mark-read"]');
    this.emptyListHeader = page.getByTestId("empty-list-header");
  }

  async goto(): Promise<void> {
    await this.page.goto("/notifications");
  }

  async markFirstRead(): Promise<void> {
    const response = this.page.waitForResponse(
      (res) =>
        res.url().includes("/notifications/") &&
        res.request().method() === "PATCH"
    );
    await this.markReadButtons.first().click({ force: true });
    await response;
  }

  async expectEmpty(): Promise<void> {
    await expect(this.list).toHaveCount(0);
    await expect(this.emptyListHeader).toContainText("No Notifications");
  }
}
