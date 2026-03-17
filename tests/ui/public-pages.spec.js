import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import categoryModel from "../../models/categoryModel.js";

dotenv.config();

async function seedPublicCategory(name, slug) {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required to seed category for public pages E2E");
  }

  await mongoose.connect(process.env.MONGO_URL);

  try {
    await categoryModel.findOneAndUpdate(
      { slug },
      { name, slug },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } finally {
    await mongoose.disconnect();
  }
}

test.describe("Public pages browsing flow", () => {
  test("browse contact, policy, categories, and open a category page", async ({ page }) => {
    // Liu, Yiwei, A0332922J
    const timestamp = Date.now();
    const categoryName = `E2E Public Category ${timestamp}`;
    const categorySlug = `e2e-public-category-${timestamp}`;

    await seedPublicCategory(categoryName, categorySlug);

    await page.goto("/contact");
    await expect(page).toHaveURL("http://localhost:3000/contact");
    await expect(page.getByRole("heading", { name: "CONTACT US" })).toBeVisible();
    await expect(page.getByText("help@ecommerceapp.com")).toBeVisible();
    await expect(page.getByText("1800-0000-0000 (toll free)")).toBeVisible();

    await page.goto("/policy");
    await expect(page).toHaveURL("http://localhost:3000/policy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(
      page.getByText("We value your privacy and are committed to protecting your personal data.")
    ).toBeVisible();

    await page.goto("/categories");
    await expect(page).toHaveURL("http://localhost:3000/categories");

    const categoryLink = page.getByRole("link", { name: categoryName });
    await expect(categoryLink).toBeVisible({ timeout: 10000 });
    await categoryLink.click();

    await expect(page).toHaveURL(`http://localhost:3000/category/${categorySlug}`);
  });
});

// ─── Visual Regression Testing ──────────────────────────────────────────────
// Playwright's pixel-by-pixel screenshot comparison catches unintended UI
// changes to stable static pages. Baselines are created automatically on the
// first run; thereafter, any deviation beyond the threshold causes the test to
// fail. Run `npx playwright test --update-snapshots` to refresh baselines.
test.describe("Visual regression – static public pages", () => {
  test.skip(!!process.env.CI, "Visual baselines are maintained locally and skipped on CI");

  test("contact page matches visual baseline", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "CONTACT US" })).toBeVisible();
    // Allow up to 50 pixels of difference to tolerate minor rendering artifacts
    await expect(page).toHaveScreenshot("contact-page.png", { maxDiffPixels: 50 });
  });

  test("policy page matches visual baseline", async ({ page }) => {
    await page.goto("/policy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page).toHaveScreenshot("policy-page.png", { maxDiffPixels: 50 });
  });
});
