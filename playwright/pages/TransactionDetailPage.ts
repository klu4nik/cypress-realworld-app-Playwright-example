import { Page, Locator, expect } from "@playwright/test";

export class TransactionDetailPage {
  readonly page: Page;
  readonly header: Locator;
  readonly amount: Locator;
  readonly senderAvatar: Locator;
  readonly receiverAvatar: Locator;
  readonly description: Locator;
  readonly likeButton: Locator;
  readonly likeCount: Locator;
  readonly commentInput: Locator;
  readonly acceptRequestButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByTestId("transaction-detail-header");
    this.amount = page.locator('[data-test*="transaction-amount"]');
    this.senderAvatar = page.locator('[data-test*="sender-avatar"]');
    this.receiverAvatar = page.locator('[data-test*="receiver-avatar"]');
    this.description = page.locator('[data-test*="transaction-description"]');
    this.likeButton = page.locator('[data-test*="like-button"]');
    this.likeCount = page.locator('[data-test*="transaction-like-count"]');
    // CommentForm.tsx sets data-test via MUI's `inputProps`, which lands
    // it directly on the <input> — no `.locator("input")` drill-down needed
    // (see UserSettingsPage.ts for the same pattern).
    this.commentInput = page.locator('[data-test*="comment-input"]');
    this.acceptRequestButton = page.locator('[data-test*="accept-request"]');
  }

  async goto(transactionId: string): Promise<void> {
    await this.page.goto(`/transaction/${transactionId}`);
  }

  async like(): Promise<void> {
    await this.likeButton.click();
    await expect(this.likeButton).toBeDisabled();
  }

  async postComment(text: string): Promise<void> {
    await this.commentInput.fill(text);
    await this.commentInput.press("Enter");
  }

  async acceptRequest(): Promise<void> {
    const response = this.page.waitForResponse(
      (res) => res.url().includes("/transactions/") && res.request().method() === "PATCH"
    );
    await this.acceptRequestButton.click();
    await response;
  }
}
