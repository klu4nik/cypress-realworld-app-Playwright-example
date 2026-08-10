import { Page } from "@playwright/test";
import { OnboardingDialog } from "../pages/OnboardingDialog";

/**
 * A freshly-created user has no bank account, which trips
 * UserOnboardingContainer's `dialogIsOpen`/`noBankAccounts` logic
 * (src/containers/UserOnboardingContainer.tsx): a full-screen modal
 * that blocks every other UI interaction until it's completed. RWA's
 * seeded Cypress fixture users already have a bank account, so the
 * original suite never has to deal with this — every fresh user
 * created here does, regardless of which spec is logging them in.
 */
export async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  const onboarding = new OnboardingDialog(page);
  const appeared = await onboarding.dialog
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return;

  await onboarding.nextButton.click();
  await onboarding.fillBankAccountForm({
    bankName: "The Best Bank",
    accountNumber: "123456789",
    routingNumber: "987654321",
  });
  await onboarding.submitBankAccount();
  await onboarding.nextButton.click();
  await onboarding.dialog.waitFor({ state: "hidden" });
}
