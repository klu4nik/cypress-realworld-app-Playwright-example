import { Page, Locator } from "@playwright/test";

export class NavigationMenu {
  readonly page: Page;
  readonly toggle: Locator;
  readonly signOutLink: Locator;
  readonly notificationsCount: Locator;
  readonly newTransactionButton: Locator;
  readonly notificationsLink: Locator;
  readonly userSettingsLink: Locator;
  readonly notificationsSidenavLink: Locator;
  readonly userFullName: Locator;
  readonly userBalance: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggle = page.getByTestId("sidenav-toggle");
    this.signOutLink = page.getByTestId("sidenav-signout");
    this.notificationsCount = page.getByTestId("nav-top-notifications-count");
    // Always-visible top app bar controls (see src/components/NavBar.tsx) —
    // unlike the sidenav links below, these never hide behind the toggle.
    this.newTransactionButton = page.getByTestId("nav-top-new-transaction");
    this.notificationsLink = page.getByTestId("nav-top-notifications-link");
    // Sidenav-only links (src/components/NavDrawer.tsx) — collapsed behind
    // the toggle below Cypress's mobile breakpoint, use openSidenavIfMobile().
    this.userSettingsLink = page.getByTestId("sidenav-user-settings");
    this.notificationsSidenavLink = page.getByTestId("sidenav-notifications");
    this.userFullName = page.getByTestId("sidenav-user-full-name");
    this.userBalance = page.locator('[data-test*="user-balance"]');
  }

  /**
   * Port of: `if (isMobile()) cy.getBySel("sidenav-toggle").click();`
   * The sidenav collapses behind a toggle below Cypress's mobile
   * breakpoint (~414px); the "mobile-safari" Playwright project
   * (see playwright.config.ts) exercises that branch.
   */
  private isMobileViewport(): boolean {
    const viewport = this.page.viewportSize();
    return !!viewport && viewport.width < 414;
  }

  async openSidenavIfMobile(): Promise<void> {
    if (this.isMobileViewport()) {
      await this.toggle.click();
    }
  }

  async signOut(): Promise<void> {
    await this.openSidenavIfMobile();
    await this.signOutLink.click();
  }

  async goToUserSettings(): Promise<void> {
    await this.openSidenavIfMobile();
    await this.userSettingsLink.click();
  }

  /** Uses the always-visible top nav bell icon, so no mobile toggle needed. */
  async goToNotifications(): Promise<void> {
    await this.notificationsLink.click();
  }
}
