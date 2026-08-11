import { test, expect } from "../fixtures";

/**
 * Playwright port of cypress/tests/ui/user-settings.spec.ts.
 *
 * The original seeds the db and logs in as `cy.database("find", "users")`
 * (an arbitrary pre-seeded user) via `cy.loginByXstate`. Per the auth
 * suite's notes, reaching into a separately-seeded db file doesn't
 * reliably reflect what the live server has loaded, so each test here
 * creates and logs in its own fresh user through the real app instead.
 *
 * This spec only needs one user, so it uses the `loggedInUser` fixture —
 * which logs in on the default `page` — and drives everything through the
 * page-object fixtures.
 */
test.describe("User Settings", () => {
  // `loggedInUser` is unreferenced on purpose — requesting the fixture is
  // what signs the user in, and the page objects need that to have happened.
  test.beforeEach(async ({ loggedInUser, navigationMenu }) => {
    await navigationMenu.goToUserSettings();
  });

  test("renders the user settings form", async ({ page, userSettingsPage }) => {
    await expect(userSettingsPage.form).toBeVisible();
    await expect(page).toHaveURL(/\/user\/settings$/);
  });

  test("should display user setting form errors", async ({ userSettingsPage }) => {
    for (const field of ["first", "last"] as const) {
      const input =
        field === "first" ? userSettingsPage.firstNameInput : userSettingsPage.lastNameInput;
      const helperText =
        field === "first"
          ? userSettingsPage.firstNameHelperText
          : userSettingsPage.lastNameHelperText;

      await input.fill("Abc");
      await input.clear();
      await input.blur();
      await expect(helperText).toBeVisible();
      await expect(helperText).toContainText(`Enter a ${field} name`);
    }

    await userSettingsPage.emailInput.fill("abc");
    await userSettingsPage.emailInput.clear();
    await userSettingsPage.emailInput.blur();
    await expect(userSettingsPage.emailHelperText).toBeVisible();
    await expect(userSettingsPage.emailHelperText).toContainText("Enter an email address");

    await userSettingsPage.emailInput.fill("abc@bob.");
    await userSettingsPage.emailInput.blur();
    await expect(userSettingsPage.emailHelperText).toBeVisible();
    await expect(userSettingsPage.emailHelperText).toContainText(
      "Must contain a valid email address"
    );

    await userSettingsPage.phoneNumberInput.fill("abc");
    await userSettingsPage.phoneNumberInput.clear();
    await userSettingsPage.phoneNumberInput.blur();
    await expect(userSettingsPage.phoneNumberHelperText).toBeVisible();
    await expect(userSettingsPage.phoneNumberHelperText).toContainText("Enter a phone number");

    await userSettingsPage.phoneNumberInput.fill("615-555-");
    await userSettingsPage.phoneNumberInput.blur();
    await expect(userSettingsPage.phoneNumberHelperText).toBeVisible();
    await expect(userSettingsPage.phoneNumberHelperText).toContainText("Phone number is not valid");

    await expect(userSettingsPage.submitButton).toBeDisabled();
  });

  test("updates first name, last name, email and phone number", async ({
    userSettingsPage,
    navigationMenu,
  }) => {
    await userSettingsPage.firstNameInput.clear();
    await userSettingsPage.firstNameInput.fill("New First Name");
    await userSettingsPage.lastNameInput.clear();
    await userSettingsPage.lastNameInput.fill("New Last Name");
    await userSettingsPage.emailInput.clear();
    await userSettingsPage.emailInput.fill("email@email.com");
    await userSettingsPage.phoneNumberInput.clear();
    await userSettingsPage.phoneNumberInput.fill("6155551212");
    await userSettingsPage.phoneNumberInput.blur();

    await expect(userSettingsPage.submitButton).toBeEnabled();
    await userSettingsPage.submit();

    await navigationMenu.openSidenavIfMobile();
    await expect(navigationMenu.userFullName).toContainText("New First Name");
  });
});
