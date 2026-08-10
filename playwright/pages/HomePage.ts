import { Page, Locator } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly transactionList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transactionList = page.getByTestId("transaction-list");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }
}
