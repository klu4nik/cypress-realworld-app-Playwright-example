import { test, expect, createTestUser, dismissOnboardingIfPresent } from "../fixtures";

test.describe("User Sign-up and Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should redirect unauthenticated user to signin page", async ({ page }) => {
    await page.goto("/personal");
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should redirect to the home page after login", async ({ page, request, signInPage }) => {
    const user = await createTestUser(request);

    await signInPage.login(user.username, user.password, { rememberUser: true });
    await expect(page).toHaveURL(/\/$/);
  });

  test("should remember a user for 30 days after login", async ({
    page,
    context,
    request,
    signInPage,
    navigationMenu,
  }) => {
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

  test("should allow a visitor to sign-up, login, and logout", async ({
    page,
    signUpPage,
    signInPage,
    onboardingDialog,
    navigationMenu,
    homePage,
  }) => {
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
    await expect(signUpPage.title).toBeVisible();
    await expect(signUpPage.title).toContainText("Sign Up");

    await signUpPage.fillForm(userInfo);
    await signUpPage.submit();

    await signInPage.login(userInfo.username, userInfo.password);

    // Onboarding
    await onboardingDialog.expectVisible();
    await expect(navigationMenu.notificationsCount).toBeVisible();

    await onboardingDialog.nextButton.click();
    await onboardingDialog.expectTitle("Create Bank Account");

    await onboardingDialog.fillBankAccountForm({
      bankName: "The Best Bank",
      accountNumber: "123456789",
      routingNumber: "987654321",
    });
    await onboardingDialog.submitBankAccount();

    await onboardingDialog.expectTitle("Finished");
    await onboardingDialog.expectContent("You're all set!");

    await onboardingDialog.nextButton.click();
    await expect(homePage.transactionList).toBeVisible();

    await navigationMenu.signOut();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should display login errors", async ({ signInPage }) => {
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

  test("should display signup errors", async ({ signUpPage }) => {
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

  test("should error for an invalid user", async ({ signInPage }) => {
    await signInPage.login("invalidUserName", "invalidPa$$word");
    await signInPage.expectInvalidCredentialsError();
  });

  test("should error for an invalid password for existing user", async ({
    request,
    signInPage,
  }) => {
    const user = await createTestUser(request);
    await signInPage.login(user.username, "INVALID");
    await signInPage.expectInvalidCredentialsError();
  });
});
