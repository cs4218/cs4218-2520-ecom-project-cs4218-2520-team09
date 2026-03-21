import { test, expect } from "@playwright/test";

test.describe("Category Product Page", () => {
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
        await page.goto('http://localhost:3000/categories');
    });

    test.afterAll(async () => {
        if (process.env.CI) {
            await mongoose.connection.close();
        }
    });

    test('should be accessible from home page (or any page)', async ({ page }) => {
        // Ensure that the category page can be accessed from the home page
        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        
        // Check that the two created categories are present
        await expect(page.getByRole('main')).toContainText('Electronics');
        await expect(page.getByRole('main')).toContainText('Book');
    });   

    test('should be able to access specific categories', async ({ page }) => {
        // Select all electronic
        await page.getByRole('link', { name: 'Electronics' }).click();
        await expect(page.getByRole('main')).toContainText('Category - Electronics');

        // Ensure that all 2 items are present
        await expect(page.locator('h6')).toContainText('2 result(s) found');
        await expect(page.getByRole('main')).toContainText('Smartphone');
        await expect(page.getByRole('main')).toContainText('Laptop');
    });   

    test('should be able to add items to cart from category page', async ({ page }) => {
        // Add 2 items from electronics category to cart
        await page.getByRole('link', { name: 'Electronics' }).click();
        await page.getByRole('button', { name: 'Add To Cart' }).first().click();
        await page.getByRole('button', { name: 'Add To Cart' }).nth(1).click();
        await page.getByRole('link', { name: 'Cart' }).click();

        // Ensure that both items are present in CartPage
        await expect(page.locator('h1')).toContainText('You Have 2 items in your cart');
        await expect(page.getByRole('main')).toContainText('Laptop');
        await expect(page.getByRole('main')).toContainText('Smartphone');
      });
    });   

})