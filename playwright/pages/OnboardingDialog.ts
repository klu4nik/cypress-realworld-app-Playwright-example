import { Page, Locator, expect } from "@playwright/test";

export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
}

export class OnboardingDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly content: Locator;
  readonly nextButton: Locator;
  readonly listSkeleton: Locator;
  readonly bankNameInput: Locator;
  readonly accountNumberInput: Locator;
  readonly routingNumberInput: Locator;
  readonly bankAccountSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("user-onboarding-dialog");
    this.title = page.getByTestId("user-onboarding-dialog-title");
    this.content = page.getByTestId("user-onboarding-dialog-content");
    this.nextButton = page.getByTestId("user-onboarding-next");
    this.listSkeleton = page.getByTestId("list-skeleton");

    // These fields use dynamic/prefixed data-test values in the RWA
    // markup (equivalent of cy.getBySelLike), so we match by substring
    // instead of an exact testId.
    this.bankNameInput = page.locator('[data-test*="bankName-input"]').locator("input");
    this.accountNumberInput = page.locator('[data-test*="accountNumber-input"]').locator("input");
    this.routingNumberInput = page.locator('[data-test*="routingNumber-input"]').locator("input");
    this.bankAccountSubmitButton = page.locator('[data-test*="submit"]');
  }

  async fillBankAccountForm(info: BankAccountInfo): Promise<void> {
    await this.bankNameInput.fill(info.bankName);
    await this.accountNumberInput.fill(info.accountNumber);
    await this.routingNumberInput.fill(info.routingNumber);
  }

  async submitBankAccount(): Promise<void> {
    const createBankAccountResponse = this.page.waitForResponse((res) => {
      if (!res.url().includes("/graphql")) return false;
      const body = res.request().postDataJSON?.();
      return body?.operationName === "CreateBankAccount";
    });
    await this.bankAccountSubmitButton.click();
    await createBankAccountResponse;
  }

  async expectVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.listSkeleton).toHaveCount(0);
  }

  async expectTitle(text: string): Promise<void> {
    await expect(this.title).toContainText(text);
  }

  async expectContent(text: string): Promise<void> {
    await expect(this.content).toContainText(text);
  }
}
