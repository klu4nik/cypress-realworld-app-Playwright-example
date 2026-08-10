import { test, expect, UserSession } from "../fixtures";
import { NewTransactionPage, NavigationMenu, TransactionDetailPage, NotificationsPage } from "../pages";

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
 * Both sessions come from the `createUserSession` fixture (fixtures/index.ts),
 * which tracks and closes every context it creates automatically.
 */
test.describe("Notifications", () => {
  let senderSession: UserSession;
  let receiverSession: UserSession;

  test.beforeEach(async ({ createUserSession }) => {
    senderSession = await createUserSession();
    receiverSession = await createUserSession();
  });

  async function createTransactionAndOpenAsReceiver(
    type: "payment" | "request",
    amount: string,
    description: string
  ): Promise<string> {
    const nav = new NavigationMenu(senderSession.page);
    const newTransaction = new NewTransactionPage(senderSession.page);

    await nav.newTransactionButton.click();
    await newTransaction.createTransaction(
      receiverSession.user.firstName,
      amount,
      description,
      type
    );

    const receiverPage = receiverSession.page;
    const personalTab = receiverPage.locator('[data-test*="personal-tab"]');
    await personalTab.click();
    const item = receiverPage.locator('[data-test*="transaction-item"]').first();
    await expect(item).toContainText(description);
    await item.click();

    return receiverPage.url().split("/transaction/")[1];
  }

  test("receiver gets a notification when the sender likes the transaction", async () => {
    await createTransactionAndOpenAsReceiver("payment", "20", "Coffee");

    // Sender opens the same transaction and likes it. The sender is still
    // sitting on /transaction/new's success screen at this point — the
    // personal-tab nav only renders on /, /public, /contacts, or /personal
    // (see NavBar.tsx's TransactionNavTabs gating), so a reload() here would
    // reload /transaction/new itself and the tab locator would wait forever.
    const senderPage = senderSession.page;
    await senderPage.goto("/");
    const senderPersonalTab = senderPage.locator('[data-test*="personal-tab"]');
    await senderPersonalTab.click();
    const senderItem = senderPage
      .locator('[data-test*="transaction-item"]')
      .first();
    await senderItem.click();

    const senderDetail = new TransactionDetailPage(senderPage);
    await expect(senderDetail.likeCount).toContainText("0");
    await senderDetail.like();
    await expect(senderDetail.likeCount).toContainText("1");

    // Receiver checks their notifications.
    const notifications = new NotificationsPage(receiverSession.page);
    const receiverNav = new NavigationMenu(receiverSession.page);
    await receiverNav.goToNotifications();

    const firstItem = notifications.listItems.first();
    await expect(firstItem).toContainText(senderSession.user.firstName);
    await expect(firstItem).toContainText("liked");

    await notifications.markFirstRead();
  });

  test("receiver gets a notification when the sender comments on the transaction", async () => {
    await createTransactionAndOpenAsReceiver("payment", "15", "Lunch");

    const senderPage = senderSession.page;
    await senderPage.goto("/");
    const senderPersonalTab = senderPage.locator('[data-test*="personal-tab"]');
    await senderPersonalTab.click();
    const senderItem = senderPage
      .locator('[data-test*="transaction-item"]')
      .first();
    await senderItem.click();

    const senderDetail = new TransactionDetailPage(senderPage);
    await senderDetail.postComment("Thank you!");

    const notifications = new NotificationsPage(receiverSession.page);
    const receiverNav = new NavigationMenu(receiverSession.page);
    await receiverNav.goToNotifications();

    const firstItem = notifications.listItems.first();
    await expect(firstItem).toContainText(senderSession.user.firstName);
    await expect(firstItem).toContainText("commented");
  });

  test("receiver is notified of a payment", async () => {
    const nav = new NavigationMenu(senderSession.page);
    const newTransaction = new NewTransactionPage(senderSession.page);

    await nav.newTransactionButton.click();
    await newTransaction.createTransaction(
      receiverSession.user.firstName,
      "30",
      "Pizza",
      "payment"
    );

    const notifications = new NotificationsPage(receiverSession.page);
    const receiverNav = new NavigationMenu(receiverSession.page);
    await receiverNav.goToNotifications();

    const firstItem = notifications.listItems.first();
    await expect(firstItem).toContainText("received payment");
  });

  test("receiver is notified of a payment request", async () => {
    const nav = new NavigationMenu(senderSession.page);
    const newTransaction = new NewTransactionPage(senderSession.page);

    await nav.newTransactionButton.click();
    await newTransaction.createTransaction(
      receiverSession.user.firstName,
      "300",
      "Airfare",
      "request"
    );

    const notifications = new NotificationsPage(receiverSession.page);
    const receiverNav = new NavigationMenu(receiverSession.page);
    await receiverNav.goToNotifications();

    const firstItem = notifications.listItems.first();
    await expect(firstItem).toContainText("requested payment");
  });

  test("renders an empty notifications state for a brand-new user", async () => {
    // A freshly-created user has no notifications yet, giving us the
    // empty state directly without needing to intercept the response.
    const notifications = new NotificationsPage(receiverSession.page);
    const receiverNav = new NavigationMenu(receiverSession.page);
    await receiverNav.openSidenavIfMobile();
    await receiverSession.page.getByTestId("sidenav-notifications").click();

    await expect(receiverSession.page).toHaveURL(/\/notifications$/);
    await notifications.expectEmpty();
  });
});
