import { expect, test } from "@playwright/test";

test("app is running and store displays welcome dialog", async ({ page }) => {
  await page.goto("/");

  const welcomeHeading = page.getByRole("heading", {
    name: "Welcome to OWASP Juice Shop!",
  });
  await expect(welcomeHeading).toBeVisible();

  const welcomeDialog = page
    .getByRole("dialog")
    .filter({ has: welcomeHeading });
  await welcomeDialog
    .getByRole("button", { name: "Close Welcome Banner" })
    .click();
  await expect(welcomeDialog).toBeHidden();

  await expect(page.locator(".products-grid")).toBeVisible();
});

test("cookie warning is displayed and the green button dismisses it", async ({
  page,
}) => {
  await page.goto("/");

  // Dismiss the welcome dialog first; its backdrop otherwise blocks the cookie banner's button.
  await page.getByRole("button", { name: "Close Welcome Banner" }).click();

  const cookieConsent = page.getByRole("dialog", { name: "cookieconsent" });
  await expect(cookieConsent).toBeVisible();

  const dismissButton = cookieConsent.locator(".cc-dismiss");
  await expect(dismissButton).toBeVisible();
  await dismissButton.click();

  await expect(cookieConsent).toBeHidden();
});
