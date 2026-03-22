// Tan Wei Zhi, A0253519B
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

dotenv.config();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_NAME = "E2E Admin";
const ADMIN_PHONE = "91234567";

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
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: hashedPassword,
                phone: ADMIN_PHONE,
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

test.describe("Admin Dashboard E2E", () => {
    test.beforeAll(async () => {
        await ensureAdminUser();
    });

    test("login as admin then dashboard displays admin name, email, and phone", async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin");

        await expect(page.getByText(`Admin Name : ${ADMIN_NAME}`)).toBeVisible();
        await expect(page.getByText(`Admin Email : ${ADMIN_EMAIL}`)).toBeVisible();
        await expect(page.getByText(`Admin Contact : ${ADMIN_PHONE}`)).toBeVisible();
    });

    test("admin dashboard shows Admin Panel menu with all navigation links", async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin");

        await expect(page.getByText("Admin Panel")).toBeVisible();
        await expect(page.getByRole("link", { name: "Create Category" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Create Product" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
    });

    test("clicking Create Category in admin menu navigates to category management page", async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin");

        await page.getByRole("link", { name: "Create Category" }).click();

        await expect(page).toHaveURL(/\/dashboard\/admin\/create-category/);
        await expect(page.getByRole("heading", { name: "Manage Category" })).toBeVisible();
    });

    test("clicking Products in admin menu navigates to products management page", async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin");

        await page.getByRole("link", { name: "Products" }).click();

        await expect(page).toHaveURL(/\/dashboard\/admin\/products/);
    });

    test("clicking Orders in admin menu navigates to admin orders page", async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto("/dashboard/admin");

        await page.getByRole("link", { name: "Orders" }).click();

        await expect(page).toHaveURL(/\/dashboard\/admin\/orders/);
    });

    test("unauthenticated user cannot access the admin dashboard", async ({ page }) => {
        await page.goto("/dashboard/admin");

        await expect(page).not.toHaveURL("http://localhost:3000/dashboard/admin");
    });
});
