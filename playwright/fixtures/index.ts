import { test as base, Fixtures } from "@playwright/test";
import { createUserSession, UserSession } from "./user-session";
import { pageContextFixture, pageFixture, PageContextFixture, PageFixture } from "./page";

export type { UserSession } from "./user-session";
export type { TestUser } from "./test-user";
export { createTestUser } from "./test-user";
export { dismissOnboardingIfPresent } from "./onboarding";
export type { PageContextFixture, PageFixture } from "./page";

interface SessionFixtures {
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

/**
 * Merges fixture objects so groups can live in their own files and be
 * composed here.
 *
 * Note what the `Fixtures` annotations buy and cost. `Fixtures<T, W, PT, PW>`
 * separates fixtures you're *defining* (T) from ones you're *inheriting*
 * (PT), and types them differently — an inherited key requires the tuple
 * form's `scope: 'test'`, a defined key allows `scope?: 'test'`. page.ts
 * annotates its objects as `Fixtures<PageContextFixture & PlaywrightTestArgs>`,
 * which puts the inherited `page`/`contextPage` in the T slot rather than PT;
 * passing those straight to `.extend()` therefore fails with
 * `'"test" | undefined' is not assignable to '"test"'`.
 *
 * Taking and returning a bare `Fixtures` sidesteps that, because with its
 * type params defaulted `Fixtures` erases to an empty object type. That's a
 * deliberate trade: composability in exchange for type checking at this
 * boundary (the fixture *implementations* are still checked by the
 * `Fixtures<...>` annotations in page.ts). It also means this helper accepts
 * anything, so a wrong identifier here won't be caught by the compiler —
 * Playwright reports a missing fixture at runtime instead.
 */
const combineFixtures = (...args: Fixtures[]): Fixtures =>
  args.reduce((acc, fixture) => ({ ...acc, ...fixture }), {});

// Page fixtures are merged into one extend() — Playwright resolves
// dependencies by name across everything defined in the same call, so
// pageFixture's reliance on pageContextFixture's `contextPage` is fine.
// (Merge order only matters if two objects define the same key; these are
// disjoint.) Session fixtures stay inline so TypeScript can still infer
// `browser` and `createUserSession` in their implementations.
export const test = base
  .extend<PageContextFixture & PageFixture>(
    combineFixtures(pageContextFixture, pageFixture)
  )
  .extend<SessionFixtures>({
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
