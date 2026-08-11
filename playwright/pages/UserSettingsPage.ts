import { Page, Locator, expect } from "@playwright/test";

export class UserSettingsPage {
  readonly page: Page;
  readonly form: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly submitButton: Locator;
  readonly firstNameHelperText: Locator;
  readonly lastNameHelperText: Locator;
  readonly emailHelperText: Locator;
  readonly phoneNumberHelperText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("user-settings-form");
    // UserSettingsForm.tsx sets these via MUI's `inputProps`, which lands
    // data-test directly on the <input> itself (unlike SignIn/SignUp's
    // TextFields, where data-test sits on the wrapper div) — so no
    // `.locator("input")` drill-down here.
    this.firstNameInput = page.locator('[data-test*="firstName-input"]');
    this.lastNameInput = page.locator('[data-test*="lastName-input"]');
    this.emailInput = page.locator('[data-test*="email-input"]');
    this.phoneNumberInput = page.locator('[data-test*="phoneNumber-input"]');
    this.submitButton = page.locator('[data-test*="submit"]');
    this.firstNameHelperText = page.locator("#user-settings-firstName-input-helper-text");
    this.lastNameHelperText = page.locator("#user-settings-lastName-input-helper-text");
    this.emailHelperText = page.locator("#user-settings-email-input-helper-text");
    this.phoneNumberHelperText = page.locator("#user-settings-phoneNumber-input-helper-text");
  }

  async submit(): Promise<void> {
    const response = this.page.waitForResponse(
      (res) => res.url().includes("/users/") && res.request().method() === "PATCH"
    );
    await this.submitButton.click();
    await response;
  }
}
