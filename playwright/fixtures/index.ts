import { test as base } from "@playwright/test";
import { createUserSession, UserSession } from "./user-session";

export type { UserSession } from "./user-session";
export type { TestUser } from "./test-user";
export { createTestUser } from "./test-user";
export { dismissOnboardingIfPresent } from "./onboarding";

interface Fixtures {
  /** Factory for tests that need more than one logged-in user (e.g. a
   *  sender and a receiver). Every session it creates is tracked and its
   *  browser context is closed automatically after the test, whether the
   *  test passes, fails, or throws partway through — no manual
   *  `context.close()` bookkeeping required at call sites. */
  createUserSession: () => Promise<UserSession>;
  /** A single ready-to-use logged-in session, for the common case of a
   *  test that only needs one user. Built on `createUserSession`, so it
   *  gets the same automatic cleanup. */
  userSession: UserSession;
}

export const test = base.extend<Fixtures>({
  createUserSession: async ({ browser }, use) => {
    const sessions: UserSession[] = [];
    await use(async () => {
      const session = await createUserSession(browser);
      sessions.push(session);
      return session;
    });
    await Promise.all(sessions.map((session) => session.context.close()));
  },

  userSession: async ({ createUserSession }, use) => {
    await use(await createUserSession());
  },
});

export { expect } from "@playwright/test";
