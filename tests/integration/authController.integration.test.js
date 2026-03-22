import {
    updateProfileController,
    getOrdersController,
    getAllOrdersController,
    orderStatusController,
  } from "../../controllers/authController.js";

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import userModel from "../../models/userModel.js";
import orderModel from "../../models/orderModel.js";
import productModel from '../../models/productModel.js';
import categoryModel from '../../models/categoryModel.js';

// Written by
// Name: Chan Cheuk Hong John
// Student No: A0253435H

describe('authController integration test', () => {
    let app;
    let mongoServer;
    let testUser;
    let authToken;
    let testProduct;
    let testCategory;
  
    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
  
      app = express();
      app.use(express.json());
  
      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
  
      app.put("/update-profile", updateProfileController);
      app.get("/orders", getOrdersController);
      app.get("/all-orders", getAllOrdersController);
      app.put("/order-status/:orderId", orderStatusController);
    });

    beforeEach(async () => {
        await userModel.deleteMany({});
        await orderModel.deleteMany({});
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});

        testUser = await userModel.create({
          name: "Test User",
          email: "test@test.com",
          password: "123456",
          phone: "12345678",
          address: "Test Address",
          answer: "Test Answer"
        });

        const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
            email: 'test@test.com',
            password: '123456'
        });
    
        authToken = loginResponse.body.token;

        testCategory = await categoryModel.create({
            name: 'Electronics',
            slug: 'electronics'
        });

        testProduct = await productModel.create({
            name: 'Laptop',
            slug: 'laptop',
            description: 'A laptop',
            price: 1500,
            category: testCategory._id,
            quantity: 10
        });
    });
    
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    describe('updateProfileController', () => {
        it("should update user profile", async () => {
            const res = await request(app)
              .put("/update-profile")
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                name: "Updated Name",
                phone: "99999999",
                address: "New Address",
              });
      
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
      
            const updatedUser = await userModel.findById(testUser._id);

            // Ensure that fields are changed
            expect(updatedUser.name).toBe("Updated Name");
            expect(updatedUser.phone).toBe("99999999");
            expect(updatedUser.address).toBe("New Address");

            // Ensure that these fields are unchanged
            expect(updatedUser.email).toBe("test@test.com"); 
            expect(updatedUser.password).toBe("123456"); 
            expect(updatedUser.answer).toBe("Test Answer"); 
          });
    })

    describe('getOrdersController', () => {
        it('should return empty array when user has no orders', async () => {
            const response = await request(app)
                .get('/orders')
                .set('Authorization', `Bearer ${authToken}`);
    
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should get user orders successfully', async () => {
            await orderModel.create({
                products: [testProduct._id],
                payment: {
                    success: true,
                    transaction: { id: 'tn' }
                },
                buyer: testUser._id,
                status: 'Processing'
            });
    
            const response = await request(app)
                .get('/orders')
                .set('Authorization', `Bearer ${authToken}`);
    
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].buyer.name).toBe('Test User');
            expect(response.body[0].products[0].name).toBe('Laptop');
        });
    })

    describe('getAllOrdersController', () => {
        it('should return empty array when user has no orders', async () => {
            const response = await request(app)
                .get('/all-orders')
                .set('Authorization', `Bearer ${authToken}`);
    
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return all orders from multiple users', async () => {
            // First user order
            await orderModel.create({
                products: [testProduct._id],
                payment: {
                    success: true,
                    transaction: { id: 'tn' }
                },
                buyer: testUser._id,
                status: 'Processing'
            });

            // Create another user and order
            const newUser = await userModel.create({
                name: "New",
                email: "new@test.com",
                password: "111111",
                phone: "88776688",
                address: "New Address",
                answer: "New Answer"
            });

            // Second user order
            await orderModel.create({
                products: [testProduct._id, testProduct._id],
                payment: {
                    success: true,
                    transaction: { id: 'tn2' }
                },
                buyer: newUser._id,
                status: 'Processing'
            });

            const response = await request(app)
                .get('/all-orders')
                .set('Authorization', `Bearer ${authToken}`);

            // Expect 2 orders in total
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);

            //Expect the lastest order to be the first one in the response
            expect(response.body[0].buyer._id.toString()).toBe(newUser._id.toString());
            expect(response.body[1].buyer._id.toString()).toBe(testUser._id.toString());
        });
    })

    describe('orderStatusController', () => {
        it('should successfully change order status ', async () => {
            const testOrder = await orderModel.create({
                products: [testProduct._id],
                payment: {
                    success: true,
                    transaction: { id: 'tn' }
                },
                buyer: testUser._id,
                status: 'Processing'
            });

            const response = await request(app)
            .put(`/order-status/${testOrder._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                status: 'Shipped'
            });
    
            const orderInDb = await orderModel.findById(testOrder._id);
            expect(orderInDb.status).toBe('Shipped');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('Shipped');
        })
    })
})
