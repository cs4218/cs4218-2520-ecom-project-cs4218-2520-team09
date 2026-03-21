import { test, expect } from "@playwright/test";
import mongoose from "mongoose";

test.describe("Cart Page", () => {
    let electronicsCategory;
    let booksCategory;
    let products;

    // Connect to database before all tests
    test.beforeAll(async () => {
        // Only connect for github CI
        if (process.env.CI) {
            const mongoURL = process.env.MONGO_URL;
            await mongoose.connect(mongoURL);
        }
    });

    test.beforeEach(async ({ page }) => {

        await page.goto('http://localhost:3000/product/novel');
    });

    test.afterAll(async () => {
        if (process.env.CI) {
            await mongoose.connection.close();
        }
    });

    test('should be accessible from home page', async ({ page }) => {
        await page.getByRole('link', { name: 'Home' }).click();

        await page.getByRole('button', { name: 'More Details' }).first().click();

        // Ensure that correct details are there
        await expect(page.locator('h1')).toContainText('Product Details');
        await expect(page.getByRole('main')).toContainText('Similar Products ➡️');
    });

    test('should be accessible from category product page', async ({ page }) => {
        // Search for all electronics and add first item to cart
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        await page.getByRole('link', { name: 'Electronics' }).click();
        await page.getByRole('button', { name: 'More Details' }).first().click();

        // Ensure that correct details are there
        await expect(page.locator('h1')).toContainText('Product Details');
        await expect(page.getByRole('main')).toContainText('Similar Products ➡️');
    });

    test('should be able to see similiar products', async ({ page }) => {
        // Novel has no similiar products
        await expect(page.getByRole('main')).toContainText('No Similar Products Found');

        // Check Laptop
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        await page.getByRole('link', { name: 'Electronics' }).click();
        await page.getByRole('button', { name: 'More Details' }).first().click();
        await expect(page.getByRole('main')).toContainText('Similar Products ➡️');
        await expect(page.getByRole('main')).toContainText('Smartphone');
    });

    test('should be able add products into cart from product detail', async ({ page }) => {
        // Go to laptop page
        await page.goto('http://localhost:3000/product/laptop');

        // Add both Laptop and Smartphone(similar product) into cart
        await page.getByRole('button', { name: 'Add To Cart' }).first().click();
        await page.getByRole('button', { name: 'Add To Cart' }).nth(1).click();

        // Go to cart page to check
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.getByRole('main')).toContainText('Laptop');
        await expect(page.getByRole('main')).toContainText('Smartphone');
        await expect(page.locator('h1')).toContainText('You Have 2 items in your cart');
    });
})