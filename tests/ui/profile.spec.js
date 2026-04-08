// Tan Wei Zhi, A0253519B
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

dotenv.config();

const USER_EMAIL = "e2e-profile-twz@test.com";
const USER_PASSWORD = "Profile123!";
const USER_NAME = "E2E Profile User";
const USER_PHONE = "81234567";
const USER_ADDRESS = "789 Profile Lane";

async function seedProfileUser() {
    if (!process.env.MONGO_URL) {
        throw new Error("MONGO_URL is required to seed profile user for E2E tests");
    }

    await mongoose.connect(process.env.MONGO_URL);
    try {
        const hashed = await hashPassword(USER_PASSWORD);
        await userModel.findOneAndUpdate(
            { email: USER_EMAIL },
            {
                name: USER_NAME,
                email: USER_EMAIL,
                password: hashed,
                phone: USER_PHONE,
                address: USER_ADDRESS,
                answer: "Soccer",
                role: 0,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } finally {
        await mongoose.disconnect();
    }
}

async function loginAsUser(page) {
    await page.goto("/login");
    await page.locator("#exampleInputEmail1").fill(USER_EMAIL);
    await page.locator("#exampleInputPassword1").fill(USER_PASSWORD);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
}

test.describe("Profile Page E2E", () => {
    test.beforeAll(async () => {
        await seedProfileUser();
    });

    test("login then profile page shows form pre-populated with user data", async ({ page }) => {
        await loginAsUser(page);
        await page.goto("/dashboard/user/profile");

        await expect(page.locator("input[placeholder='Enter Your Name']")).toHaveValue(USER_NAME);
        await expect(page.locator("input[placeholder='Enter Your Email ']")).toHaveValue(USER_EMAIL);
        await expect(page.locator("input[placeholder='Enter Your Phone']")).toHaveValue(USER_PHONE);
        await expect(page.locator("input[placeholder='Enter Your Address']")).toHaveValue(USER_ADDRESS);
    });

    test("email field is disabled so user cannot change their email", async ({ page }) => {
        await loginAsUser(page);
        await page.goto("/dashboard/user/profile");

        await expect(page.locator("input[placeholder='Enter Your Email ']")).toBeDisabled();
    });

    test("login then update phone number shows success toast", async ({ page }) => {
        await loginAsUser(page);
        await page.goto("/dashboard/user/profile");

        const updatedPhone = "99999999";
        const phoneInput = page.locator("input[placeholder='Enter Your Phone']");
        await phoneInput.clear();
        await phoneInput.fill(updatedPhone);

        await page.getByRole("button", { name: "UPDATE", exact: true }).click();
        await expect(page.getByText("Profile Updated Successfully")).toBeVisible({ timeout: 10000 });

        // Restore original phone number
        await phoneInput.clear();
        await phoneInput.fill(USER_PHONE);
        await page.getByRole("button", { name: "UPDATE", exact: true }).click();
        await expect(page.getByText("Profile Updated Successfully")).toBeVisible({ timeout: 10000 });
    });

    test("login then update address and verify it is reflected on the user dashboard", async ({ page }) => {
        await loginAsUser(page);
        await page.goto("/dashboard/user/profile");

        const updatedAddress = "999 Updated Boulevard";
        const addressInput = page.locator("input[placeholder='Enter Your Address']");
        await addressInput.clear();
        await addressInput.fill(updatedAddress);

        await page.getByRole("button", { name: "UPDATE", exact: true }).click();
        await expect(page.getByText("Profile Updated Successfully")).toBeVisible({ timeout: 10000 });

        await page.goto("/dashboard/user");
        await expect(page.getByRole("heading", { name: updatedAddress })).toBeVisible();

        // Restore original address
        await page.goto("/dashboard/user/profile");
        await page.locator("input[placeholder='Enter Your Address']").clear();
        await page.locator("input[placeholder='Enter Your Address']").fill(USER_ADDRESS);
        await page.getByRole("button", { name: "UPDATE", exact: true }).click();
        await expect(page.getByText("Profile Updated Successfully")).toBeVisible({ timeout: 10000 });
    });

    test("submitting a password shorter than 6 characters shows an error toast", async ({ page }) => {
        await loginAsUser(page);
        await page.goto("/dashboard/user/profile");

        await page.locator("input[placeholder='Enter Your Password']").fill("12345");
        await page.getByRole("button", { name: "UPDATE", exact: true }).click();

        await expect(page.getByText("Passsword is required and at least 6 character long")).toBeVisible({
            timeout: 10000,
        });
    });

    test("unauthenticated user cannot access the profile page", async ({ page }) => {
        await page.goto("/dashboard/user/profile");

        await expect(page).not.toHaveURL("http://localhost:3000/dashboard/user/profile");
    });
});
