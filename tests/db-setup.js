import mongoose from 'mongoose';
import userModel from '../models/userModel.js';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import orderModel from '../models/orderModel.js';
import { hashPassword } from '../helpers/authHelper.js';

async function globalSetup() {

    // Only run in CI
    if (!process.env.CI) {
        return;
    }

    try {
        // Connect to test database
        const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/ecom_test';
        await mongoose.connect(mongoURL);

        // Clear all existing data
        await Promise.all([
            userModel.deleteMany({}),
            productModel.deleteMany({}),
            categoryModel.deleteMany({}),
            orderModel.deleteMany({})
        ]);

        // Create test users
        const hashedPassword = await hashPassword('test');
        
        const testUser = await userModel.create({
            name: 'Test',
            email: 'test@test.com',
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
        const products = await productModel.create([
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
                price: 999.99,
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
            }
        ]);

        // Close connection
        await mongoose.connection.close();

    } catch (error) {
        await mongoose.connection.close();
        throw error;
    }
}

export default globalSetup;