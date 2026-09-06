import { expect, test, type Page } from "@playwright/test";

async function dismissBanners(page: Page) {
  await page.getByRole("button", { name: "Close Welcome Banner" }).click();
  await page
    .getByRole("dialog", { name: "cookieconsent" })
    .locator(".cc-dismiss")
    .click();
}

test("side menu expands when opened and collapses when clicking outside", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBanners(page);

  const menuButton = page.getByRole("button", { name: "Open Sidenav" });
  await expect(menuButton).toBeVisible();

  const sidenavHeading = page.getByRole("heading", {
    name: "OWASP Juice Shop",
    level: 2,
  });
  await expect(sidenavHeading).toBeHidden();

  await menuButton.click();
  await expect(sidenavHeading).toBeVisible();

  // Click the backdrop away from the drawer panel itself to simulate a click outside the menu.
  await page
    .locator(".mat-drawer-backdrop")
    .click({ position: { x: 900, y: 300 } });
  await expect(sidenavHeading).toBeHidden();
});

test("expanded nav displays the application name and current version at the bottom", async ({
  page,
  request,
}) => {
  const versionResponse = await request.get("/rest/admin/application-version");
  expect(versionResponse.ok()).toBeTruthy();
  const { version } = (await versionResponse.json()) as { version: string };

  await page.goto("/");
  await dismissBanners(page);
  await page.getByRole("button", { name: "Open Sidenav" }).click();

  const navFooter = page.locator("mat-sidenav .appVersion");
  await expect(navFooter).toBeVisible();
  await expect(navFooter.locator(".app-name")).toHaveText("OWASP Juice Shop");
  await expect(navFooter.locator(".app-version")).toHaveText(`v${version}`);
});

test("opening the nav and clicking Customer Feedback opens the Customer Feedback dialog", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Open Sidenav" }).click();
  await page.getByRole("link", { name: "Go to contact us page" }).click();

  await expect(page).toHaveURL(/\/contact/);
  await expect(
    page.getByRole("heading", { name: "Customer Feedback" }),
  ).toBeVisible();
});

test("opening the nav and clicking AI Chat opens the AI chat page", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Open Sidenav" }).click();
  await page.getByRole("link", { name: "Go to AI chat page" }).click();

  await expect(page).toHaveURL(/\/chatbot/);
  await expect(
    page.getByText("Delivering juice one token at a time"),
  ).toBeVisible();
});

test("opening the nav and clicking About Us opens the About Us page", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Open Sidenav" }).click();
  await page.getByRole("link", { name: "Go to about us page" }).click();

  await expect(page).toHaveURL(/\/about/);
  await expect(page.getByRole("heading", { name: "About Us" })).toBeVisible();
});

test("opening the nav and clicking Photo Wall opens the Photo Wall page", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Open Sidenav" }).click();
  await page.getByRole("link", { name: "Go to photo wall" }).click();

  await expect(page).toHaveURL(/\/photo-wall/);
  await expect(page.getByRole("heading", { name: "Photo Wall" })).toBeVisible();
});

test("opening the nav and clicking Score Board opens the Score Board page", async ({
  page,
}) => {
  // A fresh Juice Shop hides this link until the Score Board challenge is discovered.
  await page.goto("/#/score-board");
  await dismissBanners(page);
  await expect(page.locator(".score-row")).toBeVisible();

  await page.goto("/");

  await page.getByRole("button", { name: "Open Sidenav" }).click();
  await page.getByRole("link", { name: "Open score-board" }).click();

  await expect(page).toHaveURL(/\/score-board/);
  await expect(page.locator(".score-row")).toBeVisible();
});

test("the GitHub nav entry links to the OWASP Juice Shop GitHub page", async ({
  page,
}) => {
  await page.goto("/");
  await dismissBanners(page);

  await page.getByRole("button", { name: "Open Sidenav" }).click();

  // Checked via its href rather than clicked, since it redirects off-site to github.com.
  await expect(
    page.getByRole("link", { name: "Go to OWASP Juice Shop GitHub page" }),
  ).toHaveAttribute(
    "href",
    "./redirect?to=https://github.com/juice-shop/juice-shop",
  );
});
