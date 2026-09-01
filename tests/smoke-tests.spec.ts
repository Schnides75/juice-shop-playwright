import { expect, test, type Page } from "@playwright/test";

async function dismissBanners(page: Page) {
  await page.getByRole("button", { name: "Close Welcome Banner" }).click();
  await page
    .getByRole("dialog", { name: "cookieconsent" })
    .locator(".cc-dismiss")
    .click();
}

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

test("login prompt opens from Account > Login with email/password and Google login options", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Close Welcome Banner" }).click();
  await page
    .getByRole("dialog", { name: "cookieconsent" })
    .locator(".cc-dismiss")
    .click();

  await page.getByRole("button", { name: "Show/hide account menu" }).click();
  await page.getByRole("menuitem", { name: "Go to login page" }).click();

  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Login with Google" }),
  ).toBeVisible();
});

test("backend API responds to a health check", async ({ request }) => {
  const response = await request.get("/rest/admin/application-version");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body).toHaveProperty("version");
});

test("product listing renders products from the backend", async ({ page }) => {
  await page.goto("/");
  await dismissBanners(page);

  const products = page.locator("app-product");
  await expect(products.first()).toBeVisible();
  expect(await products.count()).toBeGreaterThan(0);
});

test("clicking a product opens its detail view", async ({ page }) => {
  await page.goto("/");
  await dismissBanners(page);

  await page
    .getByRole("button", {
      name: "Click for more information about the product",
    })
    .first()
    .click();

  const detailDialog = page
    .getByRole("dialog")
    .filter({ has: page.locator(".item-price") });
  await expect(detailDialog.locator("h1")).toBeVisible();
  await expect(detailDialog.locator(".item-price")).toBeVisible();
});

test("app loads without console errors or failed network requests", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/");
  await dismissBanners(page);
  await expect(page.locator(".products-grid")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("basket page is reachable", async ({ page }) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Show the shopping cart" }).click();

  await expect(page).toHaveURL(/\/basket/);
  await expect(page.locator("#checkoutButton")).toBeVisible();
});

test("score board page is reachable", async ({ page }) => {
  await page.goto("/#/score-board");
  await dismissBanners(page);

  await expect(page).toHaveURL(/\/score-board/);
  await expect(page.locator(".score-row")).toBeVisible();
});

test("search returns matching products", async ({ page }) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Open search" }).click();
  await page.getByRole("textbox").fill("Apple");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/search/);
  await expect(page.locator("app-product").first()).toBeVisible();
  await expect(page.locator("#searchValue")).toHaveText("Apple");
});
