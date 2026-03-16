import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

async function ensureAdminUser() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required to seed admin user for E2E tests");
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

test.describe("Admin category management flow", () => {
  // Liu, Yiwei, A0332922J.
  test("create, edit, and delete category from admin category page", async ({ page }) => {
    await ensureAdminUser();

    const timestamp = Date.now();
    const categoryName = `e2e-cat-${timestamp}`;
    const updatedCategoryName = `e2e-cat-updated-${timestamp}`;

    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/create-category");
    await expect(page).toHaveURL("http://localhost:3000/dashboard/admin/create-category");
    await expect(page.getByRole("heading", { name: "Manage Category" })).toBeVisible();

    await page.getByPlaceholder("Enter new category").first().fill(categoryName);
    await page.getByRole("button", { name: "Submit" }).first().click();

    await expect(page.getByText(`${categoryName} is created`)).toBeVisible({ timeout: 10000 });

    const createdCell = page.getByRole("cell", { name: categoryName, exact: true });
    await expect(createdCell).toBeVisible({ timeout: 10000 });

    const createdRow = createdCell.locator("xpath=ancestor::tr");
    await createdRow.getByRole("button", { name: "Edit" }).click();

    const modal = page.locator(".ant-modal-content");
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder("Enter new category").fill(updatedCategoryName);
    await modal.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText(`${updatedCategoryName} is updated`)).toBeVisible({ timeout: 10000 });

    const updatedCell = page.getByRole("cell", { name: updatedCategoryName, exact: true });
    await expect(updatedCell).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("cell", { name: categoryName, exact: true })).toHaveCount(0);

    const updatedRow = updatedCell.locator("xpath=ancestor::tr");
    await updatedRow.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("category is deleted")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("cell", { name: updatedCategoryName, exact: true })).toHaveCount(0);
  });
});
