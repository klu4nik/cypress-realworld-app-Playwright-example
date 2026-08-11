import { test, expect, createTestUser, dismissOnboardingIfPresent } from "../fixtures";
import { SignInPage, SignUpPage, OnboardingDialog, NavigationMenu, HomePage } from "../pages";

test.describe("User Sign-up and Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should redirect unauthenticated user to signin page", async ({ page }) => {
    await page.goto("/personal");
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should redirect to the home page after login", async ({ page, request }) => {
    const signIn = new SignInPage(page);
    const user = await createTestUser(request);

    await signIn.login(user.username, user.password, { rememberUser: true });
    await expect(page).toHaveURL(/\/$/);
  });

  test("should remember a user for 30 days after login", async ({ page, context, request, signInPage, navigationMenu  }) => {
    const user = await createTestUser(request);

    await signInPage.login(user.username, user.password, { rememberUser: true });
    await dismissOnboardingIfPresent(page);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "connect.sid");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.expires).toBeGreaterThan(-1);

    await navigationMenu.signOut();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should allow a visitor to sign-up, login, and logout", async ({ page }) => {
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

  test("should display login errors", async ({ page, signInPage }) => {
    await signInPage.goto();

    await signInPage.usernameInput.fill("User");
    await signInPage.usernameInput.clear();
    await signInPage.usernameInput.blur();
    await signInPage.expectUsernameRequiredError();

    await signInPage.passwordInput.fill("abc");
    await signInPage.passwordInput.blur();
    await signInPage.expectPasswordLengthError();

    await signInPage.expectSubmitDisabled();
  });

  test("should display signup errors", async ({ page, signUpPage }) => {
    await signUpPage.goto();

    await signUpPage.firstNameInput.fill("First");
    await signUpPage.firstNameInput.clear();
    await signUpPage.firstNameInput.blur();
    await signUpPage.expectFirstNameRequiredError();

    await signUpPage.lastNameInput.fill("Last");
    await signUpPage.lastNameInput.clear();
    await signUpPage.lastNameInput.blur();
    await signUpPage.expectLastNameRequiredError();

    await signUpPage.usernameInput.fill("User");
    await signUpPage.usernameInput.clear();
    await signUpPage.usernameInput.blur();
    await signUpPage.expectUsernameRequiredError();

    await signUpPage.passwordInput.fill("password");
    await signUpPage.passwordInput.clear();
    await signUpPage.passwordInput.blur();
    await signUpPage.expectPasswordRequiredError();

    await signUpPage.confirmPasswordInput.fill("DIFFERENT PASSWORD");
    await signUpPage.confirmPasswordInput.blur();
    await signUpPage.expectConfirmPasswordMismatchError();

    await signUpPage.expectSubmitDisabled();
  });

  test("should error for an invalid user", async ({ page, signInPage }) => {
    await signInPage.login("invalidUserName", "invalidPa$$word");
    await signInPage.expectInvalidCredentialsError();
  });

  test("should error for an invalid password for existing user", async ({ page, request, signInPage }) => {
    const user = await createTestUser(request);
    await signInPage.login(user.username, "INVALID");
    await signInPage.expectInvalidCredentialsError();
  });
});
