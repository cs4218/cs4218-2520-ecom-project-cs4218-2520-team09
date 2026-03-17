import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SEEDED_CATEGORY_NAME = "E2E Product Category";
const SEEDED_CATEGORY_SLUG = "e2e-product-category";

async function seedAdminAndCategory() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required to seed E2E admin/category data");
  }

  await mongoose.connect(process.env.MONGO_URL);

  try {
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);

    await userModel.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      {
        name: "E2E Admin",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        phone: "91234567",
        address: "123 E2E Street",
        answer: "Soccer",
        role: 1,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await categoryModel.findOneAndUpdate(
      { slug: SEEDED_CATEGORY_SLUG },
      {
        name: SEEDED_CATEGORY_NAME,
        slug: SEEDED_CATEGORY_SLUG,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } finally {
    await mongoose.disconnect();
  }
}

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.locator("#exampleInputEmail1").fill(ADMIN_EMAIL);
  await page.locator("#exampleInputPassword1").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

test.describe("Admin product management flow", () => {
  test("create product, verify list, update, verify persistence, then delete", async ({ page }) => {
    // Liu, Yiwei, A0332922J
    await seedAdminAndCategory();

    const timestamp = Date.now();
    const productName = `e2e-product-${timestamp}`;
    const productDescription = `E2E product description ${timestamp}`;
    const initialPrice = "123";
    const updatedPrice = "456";
    const initialQuantity = "7";
    const updatedQuantity = "11";

    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/create-product");
    await expect(page).toHaveURL("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    await page.locator(".ant-select").first().click();
    await page.locator(".ant-select-dropdown .ant-select-item-option-content", {
      hasText: SEEDED_CATEGORY_NAME,
    }).first().click();

    await page.locator('input[type="file"][name="photo"]').setInputFiles({
      name: "product.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8x8AAAAASUVORK5CYII=",
        "base64"
      ),
    });

    await page.getByPlaceholder("write a name").fill(productName);
    await page.getByPlaceholder("write a description").fill(productDescription);
    await page.getByPlaceholder("write a Price").fill(initialPrice);
    await page.getByPlaceholder("write a quantity").fill(initialQuantity);

    await page.locator(".ant-select").nth(1).click();
    await page.locator(".ant-select-dropdown .ant-select-item-option-content", {
      hasText: "Yes",
    }).first().click();

    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    await expect(page).toHaveURL("http://localhost:3000/dashboard/admin/products");
    await expect(page.getByRole("heading", { name: "All Products List" })).toBeVisible();

    const productCardLink = page.locator("a.product-link", {
      has: page.locator("h5.card-title", { hasText: productName }),
    }).first();

    await expect(productCardLink).toBeVisible({ timeout: 10000 });
    await productCardLink.click();

    await expect(page).toHaveURL(new RegExp("/dashboard/admin/product/"));
    const productUpdateUrl = page.url();

    await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

    const priceInput = page.getByPlaceholder("write a Price");
    const quantityInput = page.getByPlaceholder("write a quantity");

    // Wait for async product details load to finish before editing,
    // otherwise late state updates can overwrite typed values.
    await expect(priceInput).toHaveValue(initialPrice);
    await expect(quantityInput).toHaveValue(initialQuantity);

    await priceInput.fill(updatedPrice);
    await quantityInput.fill(updatedQuantity);
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    await expect(page).toHaveURL("http://localhost:3000/dashboard/admin/products");
    await expect(productCardLink).toBeVisible({ timeout: 10000 });

    await page.goto(productUpdateUrl);
    await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();
    await expect(page.getByPlaceholder("write a Price")).toHaveValue(updatedPrice);
    await expect(page.getByPlaceholder("write a quantity")).toHaveValue(updatedQuantity);

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

    await expect(page).toHaveURL("http://localhost:3000/dashboard/admin/products");
    await expect(
      page.locator("h5.card-title", { hasText: productName })
    ).toHaveCount(0, { timeout: 10000 });
  });
});
