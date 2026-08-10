import { test, expect, createTestUser, dismissOnboardingIfPresent } from "../fixtures";
import {
  SignInPage,
  SignUpPage,
  OnboardingDialog,
  NavigationMenu,
  HomePage,
} from "../pages";

test.describe("User Sign-up and Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should redirect unauthenticated user to signin page", async ({
    page,
  }) => {
    await page.goto("/personal");
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should redirect to the home page after login", async ({
    page,
    request,
  }) => {
    const signIn = new SignInPage(page);
    const user = await createTestUser(request);

    await signIn.login(user.username, user.password, { rememberUser: true });
    await expect(page).toHaveURL(/\/$/);
  });

  test("should remember a user for 30 days after login", async ({
    page,
    context,
    request,
  }) => {
    const signIn = new SignInPage(page);
    const nav = new NavigationMenu(page);
    const user = await createTestUser(request);

    await signIn.login(user.username, user.password, { rememberUser: true });
    await dismissOnboardingIfPresent(page);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "connect.sid");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.expires).toBeGreaterThan(-1);

    await nav.signOut();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should allow a visitor to sign-up, login, and logout", async ({
    page,
  }) => {
    const signUp = new SignUpPage(page);
    const signIn = new SignInPage(page);
    const onboarding = new OnboardingDialog(page);
    const nav = new NavigationMenu(page);
    const home = new HomePage(page);

    // Unique per run: data/database.json is never reset between runs (see
    // fixtures/test-user.ts's module note), so a fixed username would
    // collide with a prior run's signup and fail validation on a repeat run.
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const userInfo = {
      firstName: "Bob",
      lastName: "Ross",
      username: `PainterJoy90_${unique}`,
      password: "s3cret",
    };

    // beforeEach already navigated to "/"; re-navigating here would race
    // the click below against the resulting re-render.
    await page.getByTestId("signup").click();
    await expect(signUp.title).toBeVisible();
    await expect(signUp.title).toContainText("Sign Up");

    await signUp.fillForm(userInfo);
    await signUp.submit();

    await signIn.login(userInfo.username, userInfo.password);

    // Onboarding
    await onboarding.expectVisible();
    await expect(nav.notificationsCount).toBeVisible();

    await onboarding.nextButton.click();
    await onboarding.expectTitle("Create Bank Account");

    await onboarding.fillBankAccountForm({
      bankName: "The Best Bank",
      accountNumber: "123456789",
      routingNumber: "987654321",
    });
    await onboarding.submitBankAccount();

    await onboarding.expectTitle("Finished");
    await onboarding.expectContent("You're all set!");

    await onboarding.nextButton.click();
    await expect(home.transactionList).toBeVisible();

    await nav.signOut();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should display login errors", async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.goto();

    await signIn.usernameInput.fill("User");
    await signIn.usernameInput.clear();
    await signIn.usernameInput.blur();
    await signIn.expectUsernameRequiredError();

    await signIn.passwordInput.fill("abc");
    await signIn.passwordInput.blur();
    await signIn.expectPasswordLengthError();

    await signIn.expectSubmitDisabled();
  });

  test("should display signup errors", async ({ page }) => {
    const signUp = new SignUpPage(page);
    await signUp.goto();

    await signUp.firstNameInput.fill("First");
    await signUp.firstNameInput.clear();
    await signUp.firstNameInput.blur();
    await signUp.expectFirstNameRequiredError();

    await signUp.lastNameInput.fill("Last");
    await signUp.lastNameInput.clear();
    await signUp.lastNameInput.blur();
    await signUp.expectLastNameRequiredError();

    await signUp.usernameInput.fill("User");
    await signUp.usernameInput.clear();
    await signUp.usernameInput.blur();
    await signUp.expectUsernameRequiredError();

    await signUp.passwordInput.fill("password");
    await signUp.passwordInput.clear();
    await signUp.passwordInput.blur();
    await signUp.expectPasswordRequiredError();

    await signUp.confirmPasswordInput.fill("DIFFERENT PASSWORD");
    await signUp.confirmPasswordInput.blur();
    await signUp.expectConfirmPasswordMismatchError();

    await signUp.expectSubmitDisabled();
  });

  test("should error for an invalid user", async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.login("invalidUserName", "invalidPa$$word");
    await signIn.expectInvalidCredentialsError();
  });

  test("should error for an invalid password for existing user", async ({
    page,
    request,
  }) => {
    const signIn = new SignInPage(page);
    const user = await createTestUser(request);
    await signIn.login(user.username, "INVALID");
    await signIn.expectInvalidCredentialsError();
  });
});
