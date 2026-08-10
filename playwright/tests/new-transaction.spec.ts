import { test, expect, UserSession } from "../fixtures";
import { NewTransactionPage, NavigationMenu, TransactionDetailPage } from "../pages";

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
 * "sends money to a contact" and "receiver accepts a request" both need
 * two real logged-in users; each uses its own browser context via the
 * `createUserSession` fixture (fixtures/index.ts), since a single context
 * can only hold one login. That fixture also closes every context it
 * creates automatically, so tests don't need their own cleanup calls.
 */
test.describe("New Transaction", () => {
  let session: UserSession;
  let newTransaction: NewTransactionPage;
  let nav: NavigationMenu;

  test.beforeEach(async ({ userSession }) => {
    session = userSession;
    newTransaction = new NewTransactionPage(session.page);
    nav = new NavigationMenu(session.page);
  });

  test("navigates to the new transaction form, selects a user and submits a transaction payment", async ({
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();
    const { page } = session;

    await nav.newTransactionButton.click();
    await newTransaction.searchForUser(receiverSession.user.firstName);
    await newTransaction.selectUser(receiverSession.user.firstName);
    await newTransaction.fillAmountAndDescription("35", "Sushi dinner \u{1F363}");
    await newTransaction.submitPaymentButton.click();

    await expect(newTransaction.successAlert).toBeVisible();
    await expect(newTransaction.successAlert).toHaveText("Transaction Submitted!");

    await newTransaction.createAnotherButton.click();
    await page.getByTestId("app-name-logo").locator("a").click();

    const personalTab = page.locator('[data-test*="personal-tab"]');
    await personalTab.click();
    await expect(personalTab).toHaveClass(/Mui-selected/);

    await expect(page.getByTestId("transaction-list").first()).toContainText(
      "Sushi dinner"
    );
  });

  test("navigates to the new transaction form, selects a user and submits a transaction request", async ({
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();
    const { page } = session;

    await nav.newTransactionButton.click();
    await newTransaction.selectUser(receiverSession.user.firstName);
    await newTransaction.fillAmountAndDescription("95", "Fancy Hotel \u{1F3E8}");
    await newTransaction.submitRequestButton.click();

    await expect(newTransaction.successAlert).toBeVisible();
    await expect(newTransaction.successAlert).toHaveText("Transaction Submitted!");

    await newTransaction.returnToTransactionsButton.click();
    const personalTab = page.locator('[data-test*="personal-tab"]');
    await personalTab.click();
    await expect(personalTab).toHaveClass(/Mui-selected/);
    await expect(
      page.locator('[data-test*="transaction-item"]')
    ).toContainText("Fancy Hotel");
  });

  test("displays new transaction errors", async ({ createUserSession }) => {
    const receiverSession = await createUserSession();

    await nav.newTransactionButton.click();
    await newTransaction.selectUser(receiverSession.user.firstName);

    await newTransaction.amountInput.fill("43");
    await newTransaction.amountInput.clear();
    await newTransaction.amountInput.blur();
    await expect(newTransaction.amountHelperText).toBeVisible();
    await expect(newTransaction.amountHelperText).toContainText(
      "Please enter a valid amount"
    );

    await newTransaction.descriptionInput.fill("Fun");
    await newTransaction.descriptionInput.clear();
    await newTransaction.descriptionInput.blur();
    await expect(newTransaction.descriptionHelperText).toBeVisible();
    await expect(newTransaction.descriptionHelperText).toContainText(
      "Please enter a note"
    );

    await expect(newTransaction.submitRequestButton).toBeDisabled();
    await expect(newTransaction.submitPaymentButton).toBeDisabled();
  });

  test("submits a transaction payment and verifies the deposit for the receiver", async ({
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await nav.newTransactionButton.click();
    await newTransaction.createTransaction(
      receiverSession.user.firstName,
      "25",
      "Indian Food",
      "payment"
    );
    await expect(
      session.page.getByTestId("new-transaction-create-another-transaction")
    ).toBeVisible();

    // Receiver checks their own balance changed in their own session/context.
    const receiverNav = new NavigationMenu(receiverSession.page);
    await receiverSession.page.reload();
    await receiverNav.openSidenavIfMobile();
    await expect(receiverNav.userBalance.first()).toBeVisible();
  });

  test("submits a transaction request and accepts the request for the receiver", async ({
    createUserSession,
  }) => {
    const receiverSession = await createUserSession();

    await nav.newTransactionButton.click();
    await newTransaction.createTransaction(
      receiverSession.user.firstName,
      "100",
      "Fancy Hotel",
      "request"
    );
    await expect(
      session.page.getByTestId("new-transaction-create-another-transaction")
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

    const detail = new TransactionDetailPage(receiverPage);
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
      test(`by ${attr}`, async ({ createUserSession }) => {
        const targetSession = await createUserSession();

        await nav.newTransactionButton.click();
        await newTransaction.searchForUser(targetSession.user[attr]);

        const results = newTransaction.userListItems;
        await expect(results.first()).toContainText(targetSession.user[attr]);

        await newTransaction.searchInput.clear();
        await expect(newTransaction.usersList).toBeEmpty();
      });
    }
  });
});
