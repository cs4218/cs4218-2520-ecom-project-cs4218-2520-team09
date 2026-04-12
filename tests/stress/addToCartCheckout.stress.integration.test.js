// Liu, Yiwei, A0332922J
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";
import orderModel from "../../models/orderModel.js";

class CheckoutError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Liu, Yiwei, A0332922J
describe("Stress Test: Add-to-Cart and Checkout Concurrency Collision", () => {
  let mongoReplSet;
  let app;
  let testCategory;
  let popularProduct;
  const carts = new Map();

  beforeAll(async () => {
    mongoReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    await mongoose.connect(mongoReplSet.getUri());

    app = express();
    app.use(express.json());

    app.post("/cart", async (req, res) => {
      try {
        const { buyerId, productId } = req.body;

        if (!buyerId || !productId) {
          return res.status(422).send({
            ok: false,
            message: "buyerId and productId are required",
          });
        }

        const product = await productModel.findById(productId);
        if (!product) {
          return res.status(422).send({
            ok: false,
            message: "Product not found",
          });
        }

        carts.set(String(buyerId), {
          productId: String(productId),
          quantity: 1,
        });

        return res.status(201).send({
          ok: true,
          buyerId: String(buyerId),
          productId: String(productId),
        });
      } catch (error) {
        return res.status(500).send({ ok: false, message: error.message });
      }
    });

    app.post("/checkout", async (req, res) => {
      const session = await mongoose.startSession();
      try {
        const { buyerId } = req.body;

        if (!buyerId) {
          throw new CheckoutError(422, "buyerId is required");
        }

        let createdOrderId;

        await session.withTransaction(async () => {
          const cartItem = carts.get(String(buyerId));
          if (!cartItem) {
            throw new CheckoutError(422, "Cart is empty");
          }

          const updatedProduct = await productModel.findOneAndUpdate(
            {
              _id: cartItem.productId,
              quantity: { $gte: cartItem.quantity },
            },
            { $inc: { quantity: -cartItem.quantity } },
            { new: true, session }
          );

          if (!updatedProduct) {
            throw new CheckoutError(409, "Insufficient inventory");
          }

          const createdOrder = await orderModel.create(
            [
              {
                products: [cartItem.productId],
                buyer: new mongoose.Types.ObjectId(String(buyerId)),
                payment: { mode: "stress-test", status: "settled" },
              },
            ],
            { session }
          );

          createdOrderId = createdOrder[0]._id.toString();
          carts.delete(String(buyerId));
        });

        return res.status(201).send({
          ok: true,
          orderId: createdOrderId,
        });
      } catch (error) {
        if (error instanceof CheckoutError) {
          return res.status(error.status).send({ ok: false, message: error.message });
        }
        return res.status(500).send({ ok: false, message: error.message });
      } finally {
        await session.endSession();
      }
    });
  });

  beforeEach(async () => {
    carts.clear();
    await orderModel.deleteMany({});
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});

    testCategory = await categoryModel.create({
      name: "Stress Category",
      slug: "stress-category",
    });

    popularProduct = await productModel.create({
      name: "Popular Stress Product",
      slug: "popular-stress-product",
      description: "A product for collision stress tests",
      price: 199,
      category: testCategory._id,
      quantity: 40,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoReplSet.stop();
  });

  // Liu, Yiwei, A0332922J
  test("creates a checkout collision burst and preserves atomicity under contention", async () => {
    const spikeSize = 150;
    const popularProductId = popularProduct._id.toString();
    const buyers = Array.from({ length: spikeSize }, () => new mongoose.Types.ObjectId().toString());

    const cartResponses = await Promise.all(
      buyers.map((buyerId) =>
        request(app)
          .post("/cart")
          .send({ buyerId, productId: popularProductId })
      )
    );

    cartResponses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.productId).toBe(popularProductId);
    });

    const checkoutResponses = await Promise.all(
      buyers.map((buyerId) =>
        request(app)
          .post("/checkout")
          .send({ buyerId })
      )
    );

    const statusCounts = checkoutResponses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    const successResponses = checkoutResponses.filter((res) => res.status === 201);
    const conflictOrUnprocessableResponses = checkoutResponses.filter(
      (res) => res.status === 409 || res.status === 422
    );

    const conflictOrUnprocessablePct =
      (conflictOrUnprocessableResponses.length / spikeSize) * 100;

    console.log("Stress status counts:", statusCounts);
    console.log(
      `Stress rejection rate (409/422): ${conflictOrUnprocessablePct.toFixed(2)}%`
    );

    expect(successResponses.length + conflictOrUnprocessableResponses.length).toBe(spikeSize);
    expect(conflictOrUnprocessableResponses.length).toBeGreaterThan(0);
    expect(conflictOrUnprocessablePct).toBeGreaterThan(0);

    const observedOrderIds = successResponses.map((res) => res.body.orderId);
    const uniqueOrderIds = new Set(observedOrderIds);
    expect(uniqueOrderIds.size).toBe(observedOrderIds.length);

    const persistedOrders = await orderModel.find({});
    const persistedOrderIds = persistedOrders.map((order) => order._id.toString());
    expect(new Set(persistedOrderIds).size).toBe(persistedOrderIds.length);
    expect(persistedOrders.length).toBe(successResponses.length);

    const productAfterStress = await productModel.findById(popularProductId);
    expect(productAfterStress.quantity).toBeGreaterThanOrEqual(0);
    expect(productAfterStress.quantity).toBe(40 - successResponses.length);
  }, 120000);
});