import { Page, Locator, expect } from "@playwright/test";

export class SignInPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly usernameHelperText: Locator;
  readonly passwordHelperText: Locator;

  constructor(page: Page) {
    this.page = page;
    // page.getByTestId() reads the "data-test" attribute — see
    // playwright.config.ts's `use.testIdAttribute`. RWA's data-test lands
    // on MUI's TextField wrapper div, so .locator("input") drills to the
    // actual editable element.
    this.usernameInput = page.getByTestId("signin-username").locator("input");
    this.passwordInput = page.getByTestId("signin-password").locator("input");
    this.rememberMeCheckbox = page
      .getByTestId("signin-remember-me")
      .locator("input");
    this.submitButton = page.getByTestId("signin-submit");
    this.errorMessage = page.getByTestId("signin-error");
    this.usernameHelperText = page.locator("#username-helper-text");
    this.passwordHelperText = page.locator("#password-helper-text");
  }

  async goto(): Promise<void> {
    await this.page.goto("/signin");
  }

  /** Port of the cy.login custom command. */
  async login(
    username: string,
    password: string,
    { rememberUser = false }: { rememberUser?: boolean } = {}
  ): Promise<void> {
    if (!new URL(this.page.url()).pathname.startsWith("/signin")) {
      await this.goto();
    }

    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);

    if (rememberUser) {
      await this.rememberMeCheckbox.check();
    }

    const loginResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes("/login") && res.request().method() === "POST"
    );
    await this.submitButton.click();
    await loginResponse;
  }

  async expectUsernameRequiredError(): Promise<void> {
    await expect(this.usernameHelperText).toBeVisible();
    await expect(this.usernameHelperText).toContainText(
      "Username is required"
    );
  }

  async expectPasswordLengthError(): Promise<void> {
    await expect(this.passwordHelperText).toBeVisible();
    await expect(this.passwordHelperText).toContainText(
      "Password must contain at least 4 characters"
    );
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectInvalidCredentialsError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(
      "Username or password is invalid"
    );
  }
}
