import { APIRequestContext } from "@playwright/test";
import { API_URL } from "./api-url";

export interface TestUser {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

/**
 * Creates a real user through the app's own POST /users signup endpoint,
 * the same request the UI sign-up form issues.
 *
 * We intentionally do NOT reseed data/database.json from an external
 * process: the running `yarn dev` server only knows about data it loaded
 * or mutated itself (it never re-reads the file from disk mid-run), so a
 * user created here — through the live server — is guaranteed to actually
 * exist for a subsequent login, unlike a user pulled from a
 * freshly-reseeded file the server never re-read. The database *is*
 * reseeded once the whole suite finishes — see global-teardown.ts — but
 * never mid-run, so tests can't rely on starting from a clean slate.
 */
export async function createTestUser(
  request: APIRequestContext
): Promise<TestUser> {
  const unique = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  const user: TestUser = {
    // Unique per user, not just "Playwright": many tests run within the
    // same suite, and the database isn't reset until the whole run ends
    // (see the module note above), so a fixed firstName would accumulate
    // same-named users across the run. NewTransactionPage.selectUser()/
    // searchForUser() find a receiver by firstName substring and take the
    // first match — with a shared name, that can silently resolve to a
    // *different* user than the one this test just created.
    firstName: `Playwright${unique}`,
    lastName: "Tester",
    username: `pw_${unique}`,
    password: "s3cret",
  };

  const response = await request.post(`${API_URL}/users`, {
    data: {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      password: user.password,
      confirmPassword: user.password,
    },
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `createTestUser() failed: POST ${API_URL}/users returned ${response.status()} ${response.statusText()}\n${body}`
    );
  }

  return user;
}
