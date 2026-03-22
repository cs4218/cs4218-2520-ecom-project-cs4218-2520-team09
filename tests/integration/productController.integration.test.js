import {
    getProductController,
    getSingleProductController,
    productPhotoController,
    productFiltersController,
    productCountController,
    productListController,
    searchProductController,
    relatedProductController,
    productCategoryController,
    brainTreeTokenController,
    brainTreePaymentController,
  } from "../../controllers/productController.js";

import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { MongoMemoryServer } from "mongodb-memory-server";
import productModel from '../../models/productModel.js';
import categoryModel from '../../models/categoryModel.js';
import orderModel from '../../models/orderModel.js';

// Written by
// Name: Chan Cheuk Hong John
// Student No: A0253435H

describe('productController integration test', () => {
    let mongoServer;
    let app;
    let testCategory;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create()
        await mongoose.connect(mongoServer.getUri());

        app = express();
        app.use(express.json());

        app.get("/get-products", getProductController);
        app.get("/get-product/:slug", getSingleProductController);
        app.get("/product-photo/:pid", productPhotoController);
        app.post("/product-filters", productFiltersController);
        app.get("/product-count", productCountController);
        app.get("/product-list/:page", productListController);
        app.get("/search/:keyword", searchProductController);
        app.get("/related-product/:pid/:cid", relatedProductController);
        app.get("/product-category/:slug", productCategoryController);
        app.get("/braintree/token", brainTreeTokenController);
        app.post("/braintree/payment", brainTreePaymentController);
    });

    beforeEach(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        await orderModel.deleteMany({});

        testCategory = await categoryModel.create({
            name: 'Electronics',
            slug: 'electronics'
        });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop()
    });

    describe('getProductController', () => {
        it('should get all products', async () => {
            // Create 14 products
            for (let i = 1; i <= 14; i++) {
                await productModel.create({
                    name: `Product ${i}`,
                    slug: `product-${i}`,
                    description: `Description ${i}`,
                    price: i * 100,
                    category: testCategory._id,
                    quantity: 10
                });
            }

            const response = await request(app).get('/get-products');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(12); // controller limits to 12 product
            expect(response.body.countTotal).toBe(12);
        })

        it('should work even with no products', async () => {
            const response = await request(app).get('/get-products');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.countTotal).toBe(0);
        })
    })

    describe('getSingleProductController', () => {
        it('should get single product successfully', async () => {
            // Create test product
            await productModel.create({
                name: 'Laptop',
                slug: 'laptop',
                description: 'Laptop',
                price: 1500,
                category: testCategory._id,
                quantity: 10
            });

            const response = await request(app).get('/get-product/laptop');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.product.name).toBe('Laptop');
            expect(response.body.product.price).toBe(1500);
        })

        it('should handle events when product not found', async () => {
            const response = await request(app).get('/get-product/ghost');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Product not found');
        })
    })

    describe('productPhotoController', () => {
        let testProduct;
        let testProductNoPhoto;

        beforeEach(async () => {
            await productModel.deleteMany({});

            const products = await productModel.create([
                {
                    name: 'Laptop',
                    slug: 'laptop',
                    description: 'A new laptop',
                    price: 1500,
                    category: testCategory._id,
                    quantity: 10,
                    photo: { data: Buffer.from('abc123'), contentType: 'image/jpeg' }
                },
                {
                    name: 'Phone',
                    slug: 'phone',
                    description: 'A new phone',
                    price: 999,
                    category: testCategory._id,
                    quantity: 10,
                }
            ])

            testProduct = products.find(p => p.slug === 'laptop');
            testProductNoPhoto = products.find(p => p.slug === 'phone');
        })

        it('should successfully return photo data if present', async () => {
            const response = await request(app)
                .get(`/product-photo/${testProduct._id}`);
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('image/jpeg');
            expect(response.body).toBeDefined();
        });
    
        it('should return 404 if product is not found', async () => {
            const response = await request(app)
                .get(`/product-photo/${testCategory._id}`);
            
            expect(response.status).toBe(404);
            expect(response.text).toBe('Product not found');
        });

        it('should return 404 if photo is missing', async () => {
            const response = await request(app)
                .get(`/product-photo/${testProductNoPhoto._id}`);
            
            expect(response.status).toBe(404);
            expect(response.text).toBe('Product photo data not found');
        });
    })

    describe('productFiltersController', () => {
        let booksCategory;
        let shirtCategory;

        beforeEach(async () => {
            await productModel.deleteMany({});
            await categoryModel.deleteMany({});
    
            booksCategory = await categoryModel.create({
                name: 'Books',
                slug: 'books'
            });

            shirtCategory = await categoryModel.create({
                name: 'Shirt',
                slug: 'shirt'
            });
    
            await productModel.create([
                {
                    name: 'Laptop',
                    slug: 'laptop',
                    description: 'A laptop',
                    price: 1500,
                    category: testCategory._id,
                    quantity: 10
                },
                {
                    name: 'Mouse',
                    slug: 'mouse',
                    description: 'A mouse',
                    price: 50,
                    category: testCategory._id,
                    quantity: 20
                },
                {
                    name: 'Novel',
                    slug: 'novel',
                    description: 'A book',
                    price: 15,
                    category: booksCategory._id,
                    quantity: 30
                }
            ]);
        });

        it('should return all product when no filter is selected', async () => {
            const response = await request(app)
            .post('/product-filters')
            .send({
                checked: [],
                radio: []
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(3);
        })

        it('should properly filter products by category', async () => {
            const response = await request(app)
            .post('/product-filters')
            .send({
                checked: [testCategory._id.toString()],
                radio: []
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(2);
        })

        it('should properly filter products by price', async () => {
            const response = await request(app)
            .post('/product-filters')
            .send({
                checked: [],
                radio: [10, 100]
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(2);
        })

        it('should properly filter products by both category and price', async () => {
            const response = await request(app)
            .post('/product-filters')
            .send({
                checked: [testCategory._id.toString()],
                radio: [10, 100]
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(1);
        })

        it('should show nothing if no item match filters', async () => {
            const response = await request(app)
            .post('/product-filters')
            .send({
                checked: [shirtCategory._id.toString()],
                radio: []
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(0);
        })
    })

    describe('productCountController', () => {
        beforeEach(async () => {
            await productModel.deleteMany({});
            await productModel.create([
                { name: 'Laptop', slug: 'laptop', description: 'A laptop', price: 1500, category: testCategory._id, quantity: 10 },
                { name: 'Mouse', slug: 'mouse', description: 'A mouse', price: 50, category: testCategory._id, quantity: 20 }
            ]);
        });
    
        it('should successfully return total count of all products', async () => {
            const response = await request(app).get('/product-count');
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.total).toBe(2);
        });
    })

    describe('productListController', () => {
        beforeEach(async () => {
            await productModel.deleteMany({});
            
            for (let i = 1; i <= 10; i++) {
                await productModel.create({
                    name: `Product ${i}`,
                    slug: `product-${i}`,
                    description: `Description ${i}`,
                    price: i * 100,
                    category: testCategory._id,
                    quantity: 10
                });
            }
        });
    
        it('should successfully return products', async () => {
            const response = await request(app).get('/product-list/1');
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(6); // capped at 6 per page
        });
    
        it('should return remaining products on page 2', async () => {
            const response = await request(app).get('/product-list/2');
            
            expect(response.status).toBe(200);
            expect(response.body.products.length).toBe(4); // remaining 4 items
        });
    })

    describe('searchProductController', () => {
        beforeEach(async () => {
            await productModel.deleteMany({});

            await productModel.create([
                {
                    name: 'Laptop',
                    slug: 'laptop',
                    description: 'A new laptop',
                    price: 1500,
                    category: testCategory._id,
                    quantity: 10
                },
                {
                    name: 'Mouse',
                    slug: 'mouse',
                    description: 'A new mouse',
                    price: 50,
                    category: testCategory._id,
                    quantity: 20
                },
                {
                    name: 'Phone',
                    slug: 'phone',
                    description: 'Fancy phone',
                    price: 999,
                    category: testCategory._id,
                    quantity: 30
                }
            ]);
        })

        it('should successfully search product by name', async () => {
            const response = await request(app).get('/search/new');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
            expect(response.body.some(p => p.name === 'Laptop')).toBe(true);
            expect(response.body.some(p => p.name === 'Mouse')).toBe(true);
        })

        it('should successfully search product by description', async () => {
            const response = await request(app).get('/search/fancy');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body.some(p => p.description === 'Fancy phone')).toBe(true);
        })

        it('should return nothing if not found', async () => {
            const response = await request(app).get('/search/secret');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(0);
        })
    })
    
    describe('relatedProductController', () => {
        let laptopProduct;
        let booksCategory
        let novelProduct;

        beforeEach(async () => {
            await productModel.deleteMany({});
            await categoryModel.deleteMany({});

            booksCategory = await categoryModel.create({
                name: 'Books',
                slug: 'books'
            });

            const products = await productModel.create([
                {
                    name: 'Laptop',
                    slug: 'laptop',
                    description: 'A laptop',
                    price: 1500,
                    category: testCategory._id,
                    quantity: 10
                },
                {
                    name: 'Mouse',
                    slug: 'mouse',
                    description: 'A mouse',
                    price: 50,
                    category: testCategory._id,
                    quantity: 20
                },
                {
                    name: 'Phone',
                    slug: 'phone',
                    description: 'A phone',
                    price: 999,
                    category: testCategory._id,
                    quantity: 30
                },
                {
                    name: 'Novel',
                    slug: 'novel',
                    description: 'A book',
                    price: 15,
                    category: booksCategory._id,
                    quantity: 30
                }
            ]);

            laptopProduct = products.find(p => p.slug === 'laptop');
            novelProduct = products.find(p => p.slug === 'novel');
        });

        it('should successfully get related products', async () => {
            const response = await request(app)
            .get(`/related-product/${laptopProduct._id}/${testCategory._id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(2);
            expect(response.body.products.some(p => p.name === 'Mouse')).toBe(true);
            expect(response.body.products.some(p => p.name === 'Phone')).toBe(true);
        })

        it('should show no related product if there are none', async () => {
            const response = await request(app)
            .get(`/related-product/${novelProduct._id}/${booksCategory._id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.products.length).toBe(0);
        })
    })

    describe('productCategoryController', () => {
        beforeEach(async () => {
            await productModel.deleteMany({});
            await categoryModel.deleteMany({});

            testCategory = await categoryModel.create({
                name: 'Electronics',
                slug: 'electronics'
            });

            await categoryModel.create({
                name: 'Books',
                slug: 'books'
            });

            await productModel.create([
                {
                    name: 'Laptop',
                    slug: 'laptop',
                    description: 'A laptop',
                    price: 1500,
                    category: testCategory._id,
                    quantity: 10
                },
                {
                    name: 'Mouse',
                    slug: 'mouse',
                    description: 'A mouse',
                    price: 50,
                    category: testCategory._id,
                    quantity: 20
                },
                {
                    name: 'Phone',
                    slug: 'phone',
                    description: 'A phone',
                    price: 999,
                    category: testCategory._id,
                    quantity: 30
                }
            ]);
        })

        it('should get all products by category', async () => {
            const response = await request(app)
            .get('/product-category/electronics');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.category.name).toBe('Electronics');
            expect(response.body.products.length).toBe(3);
            expect(response.body.products.some(p => p.name === 'Laptop')).toBe(true);
            expect(response.body.products.some(p => p.name === 'Mouse')).toBe(true);
            expect(response.body.products.some(p => p.name === 'Phone')).toBe(true);
        })

        it('should show nothing if category has no products', async () => {
            const response = await request(app)
            .get('/product-category/books');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.category.name).toBe('Books');
            expect(response.body.products.length).toBe(0);
        })

        it('should return 404 for non-existent category', async () => {
            const response = await request(app)
            .get('/product-category/chickens');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Category not found');
        })
    })
})



