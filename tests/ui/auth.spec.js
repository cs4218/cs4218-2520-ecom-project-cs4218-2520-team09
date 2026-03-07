import { test, expect } from "@playwright/test";

// Zhu Shiqi, A0271719X
test("login with valid credentials redirects to home and shows user name in navbar", async ({
  page,
}) => {
  await page.goto("/login");

  await page.locator("#exampleInputEmail1").fill("cs4218@test.com");
  await page.locator("#exampleInputPassword1").fill("cs4218@test.com");
  await page.getByRole("button", { name: "LOGIN" }).click();

  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.locator(".navbar")).toContainText("CS 4218 Test Account");
});
