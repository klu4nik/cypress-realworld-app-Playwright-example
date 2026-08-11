import { test, expect, UserSession } from "../fixtures";
import type { NavigationMenu, NotificationsPage } from "../pages";

/**
 * Playwright port of cypress/tests/ui/notifications.spec.ts.
 *
 * SCOPE NOTE: the original relies on `cy.database("find", "transactions", {...})`
 * to pull an existing transaction between specific pre-seeded users, and
 * `cy.switchUserByXstate` to hop between User A/B/C without a full
 * logout. Neither transfers to Playwright (see the auth and
 * new-transaction suites' notes) — so instead of 6 near-duplicate cases
 * covering every sender/receiver/liker permutation from the original,
 * this port creates its own transaction between two fresh users via the
 * real UI, then covers each *kind* of notification once (like, comment,
 * payment received, payment requested) plus the empty-state case. This
 * is a deliberate reduction in case count, not in the underlying
 * behavior covered.
 *
 * The sender is the `loggedInUser` fixture on the default `page`, so it's
 * driven through the page-object fixtures. The receiver needs a second
 * simultaneous login and therefore its own browser context, which the page
 * fixtures can't reach — its page objects are built directly.
 */
test.describe("Notifications", () => {
  let receiverSession: UserSession;
  let receiverNav: NavigationMenu;
  let receiverNotifications: NotificationsPage;

  // `loggedInUser` is unreferenced on purpose — requesting the fixture is
  // what signs the sender in on the default page.
  test.beforeEach(async ({ loggedInUser, createUserSession }) => {
    receiverSession = await createUserSession();
    receiverNav = receiverSession.pages.navigationMenu;
    receiverNotifications = receiverSession.pages.notificationsPage;
  });

  test("receiver gets a notification when the sender likes the transaction", async ({
    page,
    loggedInUser,
    navigationMenu,
    newTransactionPage,
    transactionDetailPage,
  }) => {
    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.createTransaction(
      receiverSession.user.firstName,
      "20",
      "Coffee",
      "payment"
    );

    // Sender opens the transaction and likes it. They're still sitting on
    // /transaction/new's success screen — the personal-tab nav only renders
    // on /, /public, /contacts, or /personal (see NavBar.tsx's
    // TransactionNavTabs gating), so reloading here would reload
    // /transaction/new and the tab locator would wait forever.
    await page.goto("/");
    await page.locator('[data-test*="personal-tab"]').click();
    await page.locator('[data-test*="transaction-item"]').first().click();

    await expect(transactionDetailPage.likeCount).toContainText("0");
    await transactionDetailPage.like();
    await expect(transactionDetailPage.likeCount).toContainText("1");

    // Receiver checks their notifications.
    await receiverNav.goToNotifications();

    const firstItem = receiverNotifications.listItems.first();
    await expect(firstItem).toContainText(loggedInUser.firstName);
    await expect(firstItem).toContainText("liked");

    await receiverNotifications.markFirstRead();
  });

  test("receiver gets a notification when the sender comments on the transaction", async ({
    page,
    loggedInUser,
    navigationMenu,
    newTransactionPage,
    transactionDetailPage,
  }) => {
    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.createTransaction(
      receiverSession.user.firstName,
      "15",
      "Lunch",
      "payment"
    );

    await page.goto("/");
    await page.locator('[data-test*="personal-tab"]').click();
    await page.locator('[data-test*="transaction-item"]').first().click();

    await transactionDetailPage.postComment("Thank you!");

    await receiverNav.goToNotifications();

    const firstItem = receiverNotifications.listItems.first();
    await expect(firstItem).toContainText(loggedInUser.firstName);
    await expect(firstItem).toContainText("commented");
  });

  test("receiver is notified of a payment", async ({ navigationMenu, newTransactionPage }) => {
    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.createTransaction(
      receiverSession.user.firstName,
      "30",
      "Pizza",
      "payment"
    );

    await receiverNav.goToNotifications();

    await expect(receiverNotifications.listItems.first()).toContainText("received payment");
  });

  test("receiver is notified of a payment request", async ({
    navigationMenu,
    newTransactionPage,
  }) => {
    await navigationMenu.newTransactionButton.click();
    await newTransactionPage.createTransaction(
      receiverSession.user.firstName,
      "300",
      "Airfare",
      "request"
    );

    await receiverNav.goToNotifications();

    await expect(receiverNotifications.listItems.first()).toContainText("requested payment");
  });

  test("renders an empty notifications state for a brand-new user", async () => {
    // A freshly-created user has no notifications yet, giving us the
    // empty state directly without needing to intercept the response.
    await receiverNav.openSidenavIfMobile();
    await receiverSession.page.getByTestId("sidenav-notifications").click();

    await expect(receiverSession.page).toHaveURL(/\/notifications$/);
    await receiverNotifications.expectEmpty();
  });
});
