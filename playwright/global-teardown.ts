import { request as playwrightRequest } from "@playwright/test";
import { API_URL } from "./fixtures/api-url";

/**
 * Runs once after the whole suite finishes (wired up via `globalTeardown`
 * in the root playwright.config.ts) to reset data/database.json back to
 * its seed state — the same POST /testData/seed endpoint Cypress's
 * `cy.task("db:seed")` hits (see cypress.config.ts).
 *
 * Every test in this suite creates its own real user through the live app
 * (fixtures/test-user.ts) instead of reseeding between tests, because an
 * already-running dev server never re-reads a file rewritten by a
 * separate process — see that file's module note for why. That means
 * data/database.json accumulates one or more new users per test for the
 * entire run. Reseeding once here, after everything has finished, keeps
 * repeated `playwright test` runs from growing the database without
 * bound, without affecting the reliability of any individual run the way
 * reseeding mid-run would.
 */
export default async function globalTeardown(): Promise<void> {
  const api = await playwrightRequest.newContext();
  try {
    const response = await api.post(`${API_URL}/testData/seed`);
    if (!response.ok()) {
      throw new Error(
        `global-teardown: POST ${API_URL}/testData/seed returned ${response.status()} ${response.statusText()}`
      );
    }
  } catch (err) {
    // Don't fail the whole run over teardown — surface it, but a failed
    // reseed just means the next run starts from a larger database, not
    // a broken one.
    console.warn(`global-teardown: failed to reseed database.\n${err}`);
  } finally {
    await api.dispose();
  }
}
