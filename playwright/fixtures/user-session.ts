import { Browser, BrowserContext, Page } from "@playwright/test";
import { createTestUser, TestUser } from "./test-user";
import { SignInPage } from "../pages/SignInPage";
import { createPageObjects, PageFixture } from "./page";
import { dismissOnboardingIfPresent } from "./onboarding";

export interface UserSession {
  context: BrowserContext;
  page: Page;
  user: TestUser;
  /** Page objects bound to this session's own page. The page-object
   *  fixtures always bind to the default `page`, so they can't reach a
   *  session that opened its own browser context — use these instead. */
  pages: PageFixture;
}

/**
 * Creates a brand-new browser context, signs up a fresh user, and logs them
 * in through the real UI. One context per simulated user, since a session
 * cookie is scoped to a single context — the stand-in for Cypress's
 * `cy.switchUserByXstate()`, which has no Playwright equivalent.
 *
 * Prefer the `userSession`/`createUserSession` fixtures over calling this
 * directly: they close every context they open.
 */
export async function createUserSession(browser: Browser): Promise<UserSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const user = await createTestUser(context.request);

  const signIn = new SignInPage(page);
  await signIn.login(user.username, user.password);
  await dismissOnboardingIfPresent(page);

  return { context, page, user, pages: createPageObjects(page) };
}
