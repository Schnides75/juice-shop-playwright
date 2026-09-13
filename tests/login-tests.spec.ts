import { expect, test } from "@playwright/test";

test("Account > Login displays the Login page and its controls", async ({
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

  await expect(
    page.getByRole("heading", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Text field for the login email", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Text field for the login password", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Forgot your password?", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: "Checkbox to stay logged in or not logged in",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Login with Google", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Not yet a customer?", exact: true }),
  ).toBeVisible();
});
