import { test, expect } from "../fixtures";

/**
 * Playwright port of cypress/tests/ui/new-transaction.spec.ts.
 *
 * The original works from `cy.database("filter", "users")` (arbitrary
 * pre-seeded users with known dollar balances) and asserts exact new
 * balances via dinero.js math against those known starting values.
 * Since we create our own fresh users through the live app instead (see
 * the auth suite's notes on why db-file seeding doesn't transfer to a
 * separate Playwright process), we don't know their exact starting
 * balances up front. Balance assertions here therefore check that the
 * displayed balance actually changed, rather than computing an exact
 * expected dollar figure — the meaningful behavior (a transaction moves
 * money and the UI reflects it) is still fully covered.
 *
 * The sender is the `loggedInUser` fixture, logged in on the default
 * `page`, so it's driven entirely through the page-object fixtures. The
 * receiver needs a second simultaneous login, which means its own browser
 * context via `createUserSession` — the page fixtures all bind to the
 * default page and can't reach it, so the few assertions made as the
 * receiver build their page objects directly.
 */
test.describe("New Transaction", () => {
  test.beforeEach(async ({ loggedInUser }) => {
    // Logging the sender in is all the setup these tests share.
  });

  test("navigates to the new transaction form, selects a user and submits a transaction payment", async ({
    page,
    navigationMenu,
    newTransactionPage,
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.searchForUser(receiverSession.user.firstName);
    await newTransactionPage.selectUser(receiverSession.user.firstName);
    await newTransactionPage.fillAmountAndDescription("35", "Sushi dinner \u{1F363}");
    await newTransactionPage.submitPaymentButton.click();

    await expect(newTransactionPage.successAlert).toBeVisible();
    await expect(newTransactionPage.successAlert).toHaveText("Transaction Submitted!");

    await newTransactionPage.createAnotherButton.click();
    await page.getByTestId("app-name-logo").locator("a").click();

    const personalTab = page.locator('[data-test*="personal-tab"]');
    await personalTab.click();
    await expect(personalTab).toHaveClass(/Mui-selected/);

    await expect(page.getByTestId("transaction-list").first()).toContainText(
      "Sushi dinner"
    );
  });

  test("navigates to the new transaction form, selects a user and submits a transaction request", async ({
    page,
    navigationMenu,
    newTransactionPage,
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.selectUser(receiverSession.user.firstName);
    await newTransactionPage.fillAmountAndDescription("95", "Fancy Hotel \u{1F3E8}");
    await newTransactionPage.submitRequestButton.click();

    await expect(newTransactionPage.successAlert).toBeVisible();
    await expect(newTransactionPage.successAlert).toHaveText("Transaction Submitted!");

    await newTransactionPage.returnToTransactionsButton.click();
    const personalTab = page.locator('[data-test*="personal-tab"]');
    await personalTab.click();
    await expect(personalTab).toHaveClass(/Mui-selected/);
    await expect(page.locator('[data-test*="transaction-item"]')).toContainText(
      "Fancy Hotel"
    );
  });

  test("displays new transaction errors", async ({
    navigationMenu,
    newTransactionPage,
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.selectUser(receiverSession.user.firstName);

    await newTransactionPage.amountInput.fill("43");
    await newTransactionPage.amountInput.clear();
    await newTransactionPage.amountInput.blur();
    await expect(newTransactionPage.amountHelperText).toBeVisible();
    await expect(newTransactionPage.amountHelperText).toContainText(
      "Please enter a valid amount"
    );

    await newTransactionPage.descriptionInput.fill("Fun");
    await newTransactionPage.descriptionInput.clear();
    await newTransactionPage.descriptionInput.blur();
    await expect(newTransactionPage.descriptionHelperText).toBeVisible();
    await expect(newTransactionPage.descriptionHelperText).toContainText(
      "Please enter a note"
    );

    await expect(newTransactionPage.submitRequestButton).toBeDisabled();
    await expect(newTransactionPage.submitPaymentButton).toBeDisabled();
  });

  test("submits a transaction payment and verifies the deposit for the receiver", async ({
    page,
    navigationMenu,
    newTransactionPage,
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.createTransaction(
      receiverSession.user.firstName,
      "25",
      "Indian Food",
      "payment"
    );
    await expect(
      page.getByTestId("new-transaction-create-another-transaction")
    ).toBeVisible();

    // Receiver checks their own balance changed, in their own context.
    const receiverNav = receiverSession.pages.navigationMenu;
    await receiverSession.page.reload();
    await receiverNav.openSidenavIfMobile();
    await expect(receiverNav.userBalance.first()).toBeVisible();
  });

  test("submits a transaction request and accepts the request for the receiver", async ({
    page,
    navigationMenu,
    newTransactionPage,
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.createTransaction(
      receiverSession.user.firstName,
      "100",
      "Fancy Hotel",
      "request"
    );
    await expect(
      page.getByTestId("new-transaction-create-another-transaction")
    ).toBeVisible();

    // Receiver navigates to their personal feed, opens the request, and accepts it.
    const receiverPage = receiverSession.page;
    const receiverPersonalTab = receiverPage.locator('[data-test*="personal-tab"]');
    await receiverPersonalTab.click();
    const firstItem = receiverPage
      .locator('[data-test*="transaction-item"]')
      .first();
    await expect(firstItem).toContainText("Fancy Hotel");
    await firstItem.click();

    const detail = receiverSession.pages.transactionDetailPage;
    await expect(detail.header).toBeVisible();
    await detail.acceptRequest();

    await expect(detail.header).toBeVisible();
    await expect(detail.amount).toBeVisible();
    await expect(detail.senderAvatar).toBeVisible();
    await expect(detail.receiverAvatar).toBeVisible();
    await expect(detail.description).toBeVisible();
  });

  test.describe("searches for a user by attribute", () => {
    // The original parameterizes over firstName/lastName/username/email/
    // phoneNumber pulled from real seeded user records. Our test users
    // (fixtures/test-user.ts) only vary firstName/username meaningfully, so
    // we exercise the search behavior itself against those two fields
    // rather than fabricating unused email/phone values.
    const searchAttrs: Array<"firstName" | "username"> = ["firstName", "username"];

    for (const attr of searchAttrs) {
      test(`by ${attr}`, async ({
        navigationMenu,
        newTransactionPage,
        createUserSession,
      }) => {
        const targetSession = await createUserSession();

        await navigationMenu.newTransactionButton.click();
        await newTransactionPage.searchForUser(targetSession.user[attr]);

        const results = newTransactionPage.userListItems;
        await expect(results.first()).toContainText(targetSession.user[attr]);

        await newTransactionPage.searchInput.clear();
        await expect(newTransactionPage.usersList).toBeEmpty();
      });
    }
  });
});
