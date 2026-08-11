import { Page, Locator, expect } from "@playwright/test";

export interface SignUpInfo {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

export class SignUpPage {
  readonly page: Page;
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly firstNameHelperText: Locator;
  readonly lastNameHelperText: Locator;
  readonly usernameHelperText: Locator;
  readonly passwordHelperText: Locator;
  readonly confirmPasswordHelperText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByTestId("signup-title");
    this.firstNameInput = page.getByTestId("signup-first-name").locator("input");
    this.lastNameInput = page.getByTestId("signup-last-name").locator("input");
    this.usernameInput = page.getByTestId("signup-username").locator("input");
    this.passwordInput = page.getByTestId("signup-password").locator("input");
    this.confirmPasswordInput = page.getByTestId("signup-confirmPassword").locator("input");
    this.submitButton = page.getByTestId("signup-submit");
    this.firstNameHelperText = page.locator("#firstName-helper-text");
    this.lastNameHelperText = page.locator("#lastName-helper-text");
    this.usernameHelperText = page.locator("#username-helper-text");
    this.passwordHelperText = page.locator("#password-helper-text");
    this.confirmPasswordHelperText = page.locator("#confirmPassword-helper-text");
  }

  async goto(): Promise<void> {
    await this.page.goto("/signup");
  }

  async fillForm(info: SignUpInfo): Promise<void> {
    await this.firstNameInput.fill(info.firstName);
    await this.lastNameInput.fill(info.lastName);
    await this.usernameInput.fill(info.username);
    await this.passwordInput.fill(info.password);
    await this.confirmPasswordInput.fill(info.password);
  }

  async submit(): Promise<void> {
    const signupResponse = this.page.waitForResponse(
      (res) => res.url().includes("/users") && res.request().method() === "POST"
    );
    await this.submitButton.click();
    await signupResponse;
  }

  async expectFirstNameRequiredError(): Promise<void> {
    await expect(this.firstNameHelperText).toBeVisible();
    await expect(this.firstNameHelperText).toContainText("First Name is required");
  }

  async expectLastNameRequiredError(): Promise<void> {
    await expect(this.lastNameHelperText).toBeVisible();
    await expect(this.lastNameHelperText).toContainText("Last Name is required");
  }

  async expectUsernameRequiredError(): Promise<void> {
    await expect(this.usernameHelperText).toBeVisible();
    await expect(this.usernameHelperText).toContainText("Username is required");
  }

  async expectPasswordRequiredError(): Promise<void> {
    await expect(this.passwordHelperText).toBeVisible();
    await expect(this.passwordHelperText).toContainText("Enter your password");
  }

  async expectConfirmPasswordMismatchError(): Promise<void> {
    await expect(this.confirmPasswordHelperText).toBeVisible();
    await expect(this.confirmPasswordHelperText).toContainText("Password does not match");
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }
}
