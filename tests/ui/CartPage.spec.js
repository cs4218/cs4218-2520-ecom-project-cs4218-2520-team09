import { test, expect } from "@playwright/test";
// Login details cs4218@test.com

test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/cart");
})

test.describe("Cart Page", () => {
    test("should be accessable from home page (or any page)", async ({ page }) => {
        await page.goto('http://localhost:3000/cart');
        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.getByRole('main')).toContainText('Total : $0.00');
    })

});