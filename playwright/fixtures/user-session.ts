import { Browser, BrowserContext, Page } from "@playwright/test";
import { createTestUser, TestUser } from "./test-user";
import { SignInPage } from "../pages/SignInPage";
import { dismissOnboardingIfPresent } from "./onboarding";

export interface UserSession {
  context: BrowserContext;
  page: Page;
  user: TestUser;
}

/**
 * Creates a brand-new browser context, signs up a fresh user through the
 * live app's POST /users endpoint, and logs them in through the real UI.
 *
 * RWA's Cypress suite uses `cy.switchUserByXstate(username)` to instantly
 * swap the "active" user within a single test without a full logout —
 * a backdoor wired into the app's XState machine for Cypress's benefit
 * only. Playwright has no equivalent hook into that state machine, and
 * a session cookie is tied to one browser context, so the faithful
 * translation is: a separate browser context per simulated user, each
 * with its own real login. This is also just standard Playwright practice
 * for multi-user scenarios.
 *
 * This is the raw building block — specs should normally consume it via
 * the `userSession`/`createUserSession` fixtures in fixtures/index.ts,
 * which track and close every context automatically, rather than calling
 * this directly and having to remember cleanup.
 */
export async function createUserSession(browser: Browser): Promise<UserSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const user = await createTestUser(context.request);

  const signIn = new SignInPage(page);
  await signIn.login(user.username, user.password);
  await dismissOnboardingIfPresent(page);

  return { context, page, user };
}
