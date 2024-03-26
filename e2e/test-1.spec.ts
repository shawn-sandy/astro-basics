import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:4321/docs");
  await page.getByRole("heading", { name: "Welcome to AstroKit" }).click();
  await expect(page.getByRole("banner")).toContainText("Welcome to AstroKit");
  await page.getByRole("link", { name: "Youtube Example" }).click();
  await page
    .getByRole("heading", { name: "Why I’ll choose Astro (almost" })
    .click();
  await expect(
    page.locator("#why-ill-choose-astro-almost-every-time-in-2024")
  ).toContainText("Why I’ll choose Astro (almost) every time in 2024");
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Youtube Example" })
    .click();
  await page.getByRole("link", { name: "MDX post example" }).click();
});
