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
  await page.goto("/");
  await dismissBanners(page);

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
