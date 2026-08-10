# Cypress RealWorld App — Playwright Test Port

This folder ports Cypress RealWorld App's UI test suite (`cypress/tests/ui/`)
to Playwright. It lives alongside the existing Cypress suite in this repo;
`playwright.config.ts` at the repo root points at it.

## Coverage status

| Cypress spec | Status |
|---|---|
| `auth.spec.ts` | ✅ Ported 1:1 — all 8 cases. One case (`should allow a visitor to sign-up, login, and logout`) currently fails against a real app bug: clicking the "Sign Up" link on the sign-in page doesn't navigate (confirmed with a real mouse click too, not just Playwright) — left failing on purpose to flag the regression rather than working around it. |
| `user-settings.spec.ts` | ✅ Ported 1:1 — all 3 cases, passing. |
| `new-transaction.spec.ts` | ✅ Ported, with one adjustment (see below), passing. |
| `notifications.spec.ts` | ⚠️ Ported at reduced case count — same notification *kinds* covered (like, comment, payment received, payment requested, empty state), not every sender/receiver/liker permutation from the original's 6 cases. See the file header for why. Passing. |
| `transaction-feeds.spec.ts` | ❌ Not ported. This is a large feed-type × viewport combinatorial matrix with pagination and infinite-scroll assertions; porting it well needs more room than this pass had. Flagging rather than guessing at it. |
| `cypress/tests/api/*` | ❌ Not ported. A separate suite (RWA's own REST API contract tests) outside `cypress/tests/ui/`. Straightforward to port with Playwright's `request` fixture, just not done yet. |

Verified against a live `yarn dev` instance: 22/23 `chromium-desktop` cases
pass; the one failure above is a real app bug, not a test defect.
`mobile-safari` hasn't been run yet.

## Structure

```
playwright/
├── global-teardown.ts        # resets data/database.json once the whole suite finishes
├── fixtures/                 # test.extend() fixtures + their building blocks
│   ├── index.ts                # public entry point: test, expect, and re-exports
│   ├── user-session.ts         # createUserSession(browser): new context + real signup + login
│   ├── test-user.ts            # createTestUser(request): POST /users signup
│   ├── onboarding.ts           # dismissOnboardingIfPresent(page)
│   └── api-url.ts              # resolves the Express API's own URL/port
├── pages/                    # Page Object Model
│   ├── index.ts                # barrel export
│   ├── SignInPage.ts
│   ├── SignUpPage.ts
│   ├── OnboardingDialog.ts
│   ├── NavigationMenu.ts
│   ├── HomePage.ts
│   ├── NewTransactionPage.ts
│   ├── TransactionDetailPage.ts
│   ├── NotificationsPage.ts
│   └── UserSettingsPage.ts
└── tests/                    # spec files only
    ├── auth.spec.ts
    ├── user-settings.spec.ts
    ├── new-transaction.spec.ts
    └── notifications.spec.ts
```

Every spec imports `test`/`expect` from `../fixtures` (not `@playwright/test`
directly) and page objects from `../pages`.

## Fixtures

Every test user needs a real signup + login through the live app (see "Why
real users instead of seeded fixtures" below), and multi-user tests need a
separate browser context per user. `fixtures/index.ts` wraps that in two
fixtures instead of leaving each spec to call `createUserSession()` and
close contexts by hand:

- **`userSession`** — one ready-to-use logged-in session, for the common
  single-user case (`user-settings.spec.ts`).
- **`createUserSession`** — a factory for tests that need more than one user
  (`new-transaction.spec.ts`, `notifications.spec.ts`). Every session it
  creates during a test is tracked and its browser context closed
  automatically afterward — including ones created only partway through a
  test — so a mid-test assertion failure can't leak a browser context into
  the rest of the run the way a manual `context.close()` at the end of the
  test body would.

`auth.spec.ts` is the exception: it's testing login/signup itself, so it
drives `page`/`request` directly via `createTestUser()` rather than going
through a session fixture.

## Running

```bash
yarn test:playwright              # both projects
yarn test:playwright:ui           # Playwright's UI mode

npx playwright test --project=chromium-desktop
npx playwright test --project=mobile-safari   # exercises the isMobile() sidenav-toggle branch

npx playwright show-report        # view the HTML report after a run
```

`playwright.config.ts` boots the app for you via `webServer` (`yarn dev` on
`http://localhost:3000`) unless a dev server is already running, in which
case it's reused. `data/database.json` is never reset *during* a run (see
"Why real users instead of seeded fixtures"), so every test accumulates
one or more new users — each gets a uniquely-named user specifically so
this doesn't cause collisions within the run. Once the whole suite
finishes, `global-teardown.ts` resets the database back to its seed state
via the same `POST /testData/seed` endpoint Cypress's `cy.task("db:seed")`
uses, so repeated runs don't grow it without bound. If a run is
interrupted (killed, crashed) before teardown fires, the accumulated users
are simply left in place until the next full run completes.

**Don't run more than one `playwright test` invocation at a time against the
same dev server.** They share the same backend and the same
`data/database.json`; two concurrent runs will contend for the same process
and can produce spurious failures that have nothing to do with the code
under test.

## Porting notes (Cypress → Playwright)

| Cypress                                       | Playwright equivalent                                                                                     |
|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `cy.task("db:seed")`                          | **Dropped.** Shelling out to `yarn db:seed` as a separate process only rewrites the on-disk file — an already-running `yarn dev` server never re-reads it, so login against those "seeded" users silently fails. |
| `cy.database("find"/"filter", "users"/"transactions")` | **Dropped**, same reason. Replaced by `createTestUser()` (`fixtures/test-user.ts`), which creates a real user through the live app's own `POST /users` endpoint — guaranteed to exist wherever requests are actually served. |
| `cy.loginByXstate(username)`                  | `SignInPage.login(username, password)` — a real UI login, since there's no in-process shortcut available across a process boundary. |
| `cy.switchUserByXstate(username)`             | The `createUserSession` fixture (`fixtures/index.ts`) — a **new browser context** with its own real login. RWA's instant user-switch is a Cypress-only backdoor in the app's state machine; a session cookie is scoped to one browser context anyway, so multiple contexts is both the closest equivalent and standard Playwright practice for multi-user tests. |
| `cy.createTransaction(payload)`               | `NewTransactionPage.createTransaction(...)` — same UI-driven flow (select receiver, fill amount/description, submit payment or request). |
| `cy.getBySel(sel)` / `cy.getBySelLike(sel)`   | Locators as class properties inside each Page Object (`pages/*.ts`), built on `page.getByTestId(...)` (configured via the root `playwright.config.ts`'s `use.testIdAttribute: "data-test"`). Substring (`*Like`) cases use an explicit `[data-test*="..."]` locator, since `getByTestId` only matches exactly. Watch out: some fields put `data-test` on the wrapper `<div>` (needs `.locator("input")` to reach the actual input), others put it directly on the `<input>` via MUI's `inputProps` (no further drill-down) — check the underlying component before assuming either pattern. |
| `cy.intercept(...).as("x")` + `cy.wait("@x")` | `page.waitForResponse(...)` awaited around the triggering action, wrapped inside the relevant page object's method. |
| `isMobile()` + `sidenav-toggle` click         | `NavigationMenu.openSidenavIfMobile()`, driven by the active project's viewport (`mobile-safari` project). |
| `cy.visualSnapshot(...)`                      | Dropped — Percy/visual-regression hook specific to the Cypress setup. Swap in `expect(page).toHaveScreenshot()` if you want visual regression coverage. |

### Why real users instead of seeded fixtures

Almost every spec in this suite originally worked from Cypress's
pre-seeded, dollar-figure-known fixture users (via `cy.database`). That
data lives in a JSON file a *separate Node process* writes to — fine for
Cypress, whose Node plugin process and the running app share the same
process space, but not reliable for Playwright, which is always a
separate process talking to the app over HTTP. Every spec here works
around that by creating its own real users/transactions through the live
app instead. The trade-off: exact-dollar-amount balance assertions
(`dinero.js` math against known seed balances) become "the balance
changed" assertions, since we don't control the seed data our fresh
users start with. The behavior under test — money moves, the UI reflects
it — is still fully exercised.

A second-order consequence: `data/database.json` is never reset between
runs, so it accumulates every test user ever created. `fixtures/test-user.ts`
gives each one a unique `firstName` (not just a unique `username`) for
exactly this reason — several page objects find a user by matching on
`firstName` and taking the first result, and a fixed name would eventually
match a stale user from an earlier run instead of the one the current test
just created.

### Why a Page Object Model

- Locators live once, as typed class properties, instead of being re-typed as string literals at every call site — a markup change means editing one page object, not grepping every spec.
- Each page object also owns its own domain actions/assertions, so specs read as user actions/outcomes rather than raw locator chains.
- `testIdAttribute` in the config means every page object gets `getByTestId()`'s built-in retry/visibility semantics for free, instead of hand-rolled `[data-test=...]` CSS selectors repeated everywhere.
