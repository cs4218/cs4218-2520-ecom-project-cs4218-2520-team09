import { test, expect } from "@playwright/test";

test.describe.configure({ mode: 'parallel' });

let mongoose, userModel, productModel, categoryModel, hashPassword;

if (process.env.CI) {
    mongoose = (await import('mongoose')).default;
    userModel = (await import('../../models/userModel.js')).default;
    productModel = (await import('../../models/productModel.js')).default;
    categoryModel = (await import('../../models/categoryModel.js')).default;
    hashPassword = (await import('../../helpers/authHelper.js')).hashPassword;
}

test.describe("Cart Page", () => {
    let testUser;
    let electronicsCategory;
    let booksCategory;
    let products;

    // Connect to database before all tests
    test.beforeAll(async () => {
        // Only connect for github CI
        if (process.env.CI) {
            const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/ecom_test';
            await mongoose.connect(mongoURL);
        }
    });

    test.beforeEach(async ({ page }) => {
        if (process.env.CI) {
            await userModel.deleteMany({});
            await productModel.deleteMany({});
            await categoryModel.deleteMany({});

            // Create test user
            const hashedPassword = await hashPassword('test');
            
            await userModel.create({
                name: 'Test',
                email: 'test',
                password: hashedPassword,
                phone: '98765432',
                address: '1 Computing Drive',
                answer: 'test answer',
                role: 0
            });

            // Create test categories
            const electronicsCategory = await categoryModel.create({
                name: 'Electronics',
                slug: 'electronics'
            });

            const booksCategory = await categoryModel.create({
                name: 'Books',
                slug: 'books'
            });

            // Create test products
            await productModel.create([
                {
                    name: 'Book',
                    slug: 'book',
                    description: 'book',
                    price: 50,
                    category: booksCategory._id,
                    quantity: 50,
                    shipping: true
                },
                {
                    name: 'Smartphone',
                    slug: 'smartphone',
                    description: 'Smartphone',
                    price: 999,
                    category: electronicsCategory._id,
                    quantity: 50,
                    shipping: true
                },
                {
                    name: 'Laptop',
                    slug: 'laptop',
                    description: 'Laptop',
                    price: 1500,
                    category: electronicsCategory._id,
                    quantity: 30,
                    shipping: true
                },
                {
                    name: 'Mouse',
                    slug: 'mouse',
                    description: 'mouse',
                    price: 25,
                    category: electronicsCategory._id,
                    quantity: 100,
                    shipping: true
                }
            ]);
        }
        
        await page.goto('http://localhost:3000/cart');
    });

    test.afterEach(async () => {
        if (process.env.CI) {
            await userModel.deleteMany({});
            await productModel.deleteMany({});
            await categoryModel.deleteMany({});
        }
    });

    test.afterAll(async () => {
        if (process.env.CI) {
            await mongoose.connection.close();
        }
    });

    test("should be accessable from home page (or any page)", async ({ page }) => {
        await page.goto('http://localhost:3000/cart');
        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.getByRole('main')).toContainText('Total : $0.00');
    })

    test('should allow users to add items into cart from other pages', async ({ page }) => {
        // Add items from the home page and check if they are in the cart
        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(3).click();
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.locator('h1')).toContainText('You Have 1 items in your cart');
    });

    test('should allow users to remove item from cart', async ({ page }) => {
        // Add 2 items from home page
        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(3).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(3).click();
        
        // Return to cart page and remove items 1 by 1 
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.locator('h1')).toContainText('You Have 2 items in your cart');

        await page.getByRole('button', { name: 'Remove' }).first().click();
        await expect(page.locator('h1')).toContainText('You Have 1 items in your cart');

        await page.getByRole('button', { name: 'Remove' }).click();
        await expect(page.locator('h1')).toContainText('Your Cart Is Empty');
    });

    test('should allow logged in user to update their address', async ({ page }) => {
        // Login as test user
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@test.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('test');
        await page.getByRole('button', { name: 'LOGIN' }).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(1).click();
        await page.getByRole('link', { name: 'Cart' }).click();

        // Locate the Update Address and click on it 
        await expect(page.getByRole('main')).toContainText('Current Address');
        // Default address, may cause errors if default address changed
        await expect(page.locator('h5')).toContainText('1 Computing Drive');
        await page.getByRole('button', { name: 'Update Address' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Address' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Address' }).fill('Testing Address 12345');
        await page.getByRole('button', { name: 'UPDATE' }).click();

        // Return to cart page and check if the address is updated
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.locator('h5')).toContainText('Testing Address 12345');

        // Update address back to default to prevent errors in future tests
        await page.getByRole('button', { name: 'Update Address' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Address' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Address' }).fill('1 Computing Drive');
        await page.getByRole('button', { name: 'UPDATE' }).click();
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.locator('h5')).toContainText('1 Computing Drive');
    });

    // Note that payment by PayPal is not tested
    // Due to needing a PayPal sandbox account linked to the sandbox Braintree gateway
    test('should allow users to make payment by card after adding item to cart', async ({ page }) => {
        // User needs to be logged in to make payment
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@test.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('test');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Redirected to home page after login, add item to cart
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(3).click();

        // Go back to cart page to make payment
        await page.getByRole('link', { name: 'Cart' }).click();

        // Add in card details and click on Make Payment
        // Using testing card information
        await page.getByRole('button', { name: 'Paying with Card' }).click();
        await page.locator('iframe[name="braintree-hosted-field-number"]').contentFrame().getByRole('textbox', { name: 'Credit Card Number' }).click();
        await page.locator('iframe[name="braintree-hosted-field-number"]').contentFrame().getByRole('textbox', { name: 'Credit Card Number' }).fill('3782 822463 10005');
        await page.locator('iframe[name="braintree-hosted-field-expirationDate"]').contentFrame().getByRole('textbox', { name: 'Expiration Date' }).click();
        await page.locator('iframe[name="braintree-hosted-field-expirationDate"]').contentFrame().getByRole('textbox', { name: 'Expiration Date' }).fill('1230');
        await page.locator('iframe[name="braintree-hosted-field-cvv"]').contentFrame().getByRole('textbox', { name: 'CVV' }).click();
        await page.locator('iframe[name="braintree-hosted-field-cvv"]').contentFrame().getByRole('textbox', { name: 'CVV' }).fill('1234');
        await page.getByRole('button', { name: 'Make Payment' }).click();

        // Verify that the order is in the order history page after payment is successful
        // Depicted by the text "a few seconds ago" since the order is just made
        await expect(page.getByRole('main')).toContainText('a few seconds ago');

        // Return to the cart page, ensure that cart is cleared
        await page.getByRole('link', { name: 'Cart' }).click();
        await expect(page.locator('h1')).toContainText('Your Cart Is Empty');
    });
});