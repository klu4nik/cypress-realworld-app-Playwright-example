import { test, expect, UserSession } from "../fixtures";
import { UserSettingsPage, NavigationMenu } from "../pages";

/**
 * Playwright port of cypress/tests/ui/user-settings.spec.ts.
 *
 * The original seeds the db and logs in as `cy.database("find", "users")`
 * (an arbitrary pre-seeded user) via `cy.loginByXstate`. Per the auth
 * suite's notes, reaching into a separately-seeded db file doesn't
 * reliably reflect what the live server has loaded, so each test here
 * creates and logs in its own fresh user through the real app instead
 * (see fixtures/user-session.ts). The `userSession` fixture handles both
 * creating that user and closing its browser context afterward.
 */
test.describe("User Settings", () => {
  let session: UserSession;
  let settings: UserSettingsPage;
  let nav: NavigationMenu;

  test.beforeEach(async ({ userSession }) => {
    session = userSession;
    settings = new UserSettingsPage(session.page);
    nav = new NavigationMenu(session.page);

    await nav.goToUserSettings();
  });

  test("renders the user settings form", async () => {
    await expect(settings.form).toBeVisible();
    await expect(session.page).toHaveURL(/\/user\/settings$/);
  });

  test("should display user setting form errors", async () => {
    for (const field of ["first", "last"] as const) {
      const input =
        field === "first" ? settings.firstNameInput : settings.lastNameInput;
      const helperText =
        field === "first"
          ? settings.firstNameHelperText
          : settings.lastNameHelperText;

      await input.fill("Abc");
      await input.clear();
      await input.blur();
      await expect(helperText).toBeVisible();
      await expect(helperText).toContainText(`Enter a ${field} name`);
    }

    await settings.emailInput.fill("abc");
    await settings.emailInput.clear();
    await settings.emailInput.blur();
    await expect(settings.emailHelperText).toBeVisible();
    await expect(settings.emailHelperText).toContainText(
      "Enter an email address"
    );

    await settings.emailInput.fill("abc@bob.");
    await settings.emailInput.blur();
    await expect(settings.emailHelperText).toBeVisible();
    await expect(settings.emailHelperText).toContainText(
      "Must contain a valid email address"
    );

    await settings.phoneNumberInput.fill("abc");
    await settings.phoneNumberInput.clear();
    await settings.phoneNumberInput.blur();
    await expect(settings.phoneNumberHelperText).toBeVisible();
    await expect(settings.phoneNumberHelperText).toContainText(
      "Enter a phone number"
    );

    await settings.phoneNumberInput.fill("615-555-");
    await settings.phoneNumberInput.blur();
    await expect(settings.phoneNumberHelperText).toBeVisible();
    await expect(settings.phoneNumberHelperText).toContainText(
      "Phone number is not valid"
    );

    await expect(settings.submitButton).toBeDisabled();
  });

  test("updates first name, last name, email and phone number", async () => {
    await settings.firstNameInput.clear();
    await settings.firstNameInput.fill("New First Name");
    await settings.lastNameInput.clear();
    await settings.lastNameInput.fill("New Last Name");
    await settings.emailInput.clear();
    await settings.emailInput.fill("email@email.com");
    await settings.phoneNumberInput.clear();
    await settings.phoneNumberInput.fill("6155551212");
    await settings.phoneNumberInput.blur();

    await expect(settings.submitButton).toBeEnabled();
    await settings.submit();

    await nav.openSidenavIfMobile();
    await expect(nav.userFullName).toContainText("New First Name");
  });
});
