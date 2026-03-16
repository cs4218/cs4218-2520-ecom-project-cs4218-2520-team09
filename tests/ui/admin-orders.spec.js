import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import orderModel from "../../models/orderModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const BUYER_EMAIL = "e2e-order-buyer@example.com";
const BUYER_NAME = "E2E Order Buyer";
const CATEGORY_SLUG = "e2e-orders-category";

async function seedAdminAndOrderData() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required to seed admin orders E2E data");
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

    const buyerHashedPassword = await hashPassword("Buyer123!");
    const buyer = await userModel.findOneAndUpdate(
      { email: BUYER_EMAIL },
      {
        name: BUYER_NAME,
        email: BUYER_EMAIL,
        password: buyerHashedPassword,
        phone: "90000000",
        address: "456 Buyer Lane",
        answer: "Tennis",
        role: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const category = await categoryModel.findOneAndUpdate(
      { slug: CATEGORY_SLUG },
      {
        name: "E2E Orders Category",
        slug: CATEGORY_SLUG,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const ts = Date.now();
    const productName = `e2e-order-product-${ts}`;
    const product = await productModel.create({
      name: productName,
      slug: slugify(productName),
      description: `E2E order product description ${ts}`,
      price: 99,
      category: category._id,
      quantity: 3,
      shipping: true,
    });

    await orderModel.deleteMany({ buyer: buyer._id });

    await orderModel.create({
      products: [product._id],
      payment: { success: true },
      buyer: buyer._id,
      status: "Not Processed",
    });
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

test.describe("Admin orders status management flow", () => {
  test("navigate orders, update first order status, and verify updated UI", async ({ page }) => {
    // Liu, Yiwei, A0332922J
    await seedAdminAndOrderData();

    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/orders");
    await expect(page).toHaveURL("http://localhost:3000/dashboard/admin/orders");
    await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();

    const orderBlock = page.locator(".border.shadow").first();

    await expect(orderBlock).toBeVisible({ timeout: 10000 });

    const statusSelect = orderBlock.locator(".ant-select").first();
    const statusLabel = orderBlock.locator(".ant-select-selection-item").first();
    const currentStatus = (await statusLabel.innerText()).trim();
    const nextStatus = currentStatus === "Shipped" ? "Delivered" : "Shipped";

    await statusSelect.click();
    await page
      .locator(".ant-select-dropdown .ant-select-item-option-content", {
        hasText: nextStatus,
      })
      .first()
      .click();

    await expect(statusLabel).toContainText(nextStatus, { timeout: 10000 });
  });
});
