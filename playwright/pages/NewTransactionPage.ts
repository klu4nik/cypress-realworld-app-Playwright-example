import { Page, Locator, expect } from "@playwright/test";

export class NewTransactionPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly userListItems: Locator;
  readonly usersList: Locator;
  readonly amountInput: Locator;
  readonly descriptionInput: Locator;
  readonly amountHelperText: Locator;
  readonly descriptionHelperText: Locator;
  readonly submitPaymentButton: Locator;
  readonly submitRequestButton: Locator;
  readonly createAnotherButton: Locator;
  readonly returnToTransactionsButton: Locator;
  readonly successAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId("user-list-search-input");
    this.userListItems = page.locator('[data-test*="user-list-item"]');
    this.usersList = page.getByTestId("users-list");
    this.amountInput = page.locator('[data-test*="amount-input"]').locator("input");
    this.descriptionInput = page
      .locator('[data-test*="description-input"]')
      .locator("input");
    this.amountHelperText = page.locator(
      "#transaction-create-amount-input-helper-text"
    );
    this.descriptionHelperText = page.locator(
      "#transaction-create-description-input-helper-text"
    );
    this.submitPaymentButton = page.locator('[data-test*="submit-payment"]');
    this.submitRequestButton = page.locator('[data-test*="submit-request"]');
    this.createAnotherButton = page.locator(
      '[data-test*="create-another-transaction"]'
    );
    this.returnToTransactionsButton = page.locator(
      '[data-test*="return-to-transactions"]'
    );
    this.successAlert = page.getByTestId("alert-bar-success");
  }

  async searchForUser(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /** Clicks the first user-list entry whose text contains `name`. */
  async selectUser(name: string): Promise<void> {
    await this.userListItems.filter({ hasText: name }).first().click();
  }

  async fillAmountAndDescription(
    amount: string,
    description: string
  ): Promise<void> {
    await this.amountInput.fill(amount);
    await this.descriptionInput.fill(description);
  }

  /**
   * Port of the app-level `cy.createTransaction` custom command: selects
   * the receiver, fills the form, and submits as a payment or a request.
   * Assumes the New Transaction view is already open.
   */
  async createTransaction(
    receiverName: string,
    amount: string,
    description: string,
    type: "payment" | "request"
  ): Promise<void> {
    await this.selectUser(receiverName);
    await this.fillAmountAndDescription(amount, description);
    if (type === "payment") {
      await this.submitPaymentButton.click();
    } else {
      await this.submitRequestButton.click();
    }
    await expect(this.successAlert).toBeVisible();
  }
}
