import { Page, Fixtures, PlaywrightTestArgs } from "@playwright/test";
import {
  HomePage,
  NavigationMenu,
  OnboardingDialog,
  SignInPage,
  SignUpPage,
  NewTransactionPage,
  TransactionDetailPage,
  NotificationsPage,
  UserSettingsPage,
} from "../pages";

export type PageContextFixture = {
  contextPage: Page;
};

export type PageFixture = {
  homePage: HomePage;
  navigationMenu: NavigationMenu;
  onboardingDialog: OnboardingDialog;
  signInPage: SignInPage;
  signUpPage: SignUpPage;
  newTransactionPage: NewTransactionPage;
  transactionDetailPage: TransactionDetailPage;
  notificationsPage: NotificationsPage;
  userSettingsPage: UserSettingsPage;
};

export const pageContextFixture: Fixtures<PageContextFixture & PlaywrightTestArgs> = {
  contextPage: async ({ page }, use) => {
    await use(page);
  },
};

export const pageFixture: Fixtures<PageFixture & PageContextFixture> = {
  homePage: async ({ contextPage }, use) => {
    await use(new HomePage(contextPage));
  },
  navigationMenu: async ({ contextPage }, use) => {
    await use(new NavigationMenu(contextPage));
  },
  onboardingDialog: async ({ contextPage }, use) => {
    await use(new OnboardingDialog(contextPage));
  },
  signInPage: async ({ contextPage }, use) => {
    await use(new SignInPage(contextPage));
  },
  signUpPage: async ({ contextPage }, use) => {
    await use(new SignUpPage(contextPage));
  },
  newTransactionPage: async ({ contextPage }, use) => {
    await use(new NewTransactionPage(contextPage));
  },
  transactionDetailPage: async ({ contextPage }, use) => {
    await use(new TransactionDetailPage(contextPage));
  },
  notificationsPage: async ({ contextPage }, use) => {
    await use(new NotificationsPage(contextPage));
  },
  userSettingsPage: async ({ contextPage }, use) => {
    await use(new UserSettingsPage(contextPage));
  },
};
