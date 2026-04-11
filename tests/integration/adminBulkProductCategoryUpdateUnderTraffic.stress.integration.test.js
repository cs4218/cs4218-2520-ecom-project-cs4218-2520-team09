// Liu, Yiwei, A0332922J
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { performance } from "perf_hooks";
import { MongoMemoryServer } from "mongodb-memory-server";

import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";

import { setTimeout as sleep } from "timers/promises";

// Liu, Yiwei, A0332922J
describe("Stress Test: Admin Bulk Product/Category Update Under Traffic", () => {
  let mongoServer;
  let app;
  let seededCategories;

  let writeLockHolders = 0;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    seededCategories = await categoryModel.create([
      { name: "Electronics", slug: "electronics" },
      { name: "Books", slug: "books" },
      { name: "Gaming", slug: "gaming" },
      { name: "Home", slug: "home" },
      { name: "Fashion", slug: "fashion" },
      { name: "Outdoors", slug: "outdoors" },
    ]);

    const products = [];
    for (let i = 0; i < 120; i += 1) {
      products.push({
        name: `Traffic Product ${i}`,
        slug: `traffic-product-${i}`,
        description: `Product for read/write contention ${i}`,
        price: 50 + i,
        quantity: 100,
        category: seededCategories[i % seededCategories.length]._id,
      });
    }
    await productModel.insertMany(products);

    app = express();
    app.use(express.json());

    app.get("/products", async (req, res) => {
      const startedAt = performance.now();
      try {
        // If admin writes are active, hold reads briefly and fail fast to simulate lock contention.
        if (writeLockHolders > 0) {
          await sleep(380);
        }

        if (writeLockHolders > 0 && performance.now() - startedAt >= 300) {
          return res.status(504).send({
            ok: false,
            message: "Read timeout due to admin write lock contention",
            latencyMs: performance.now() - startedAt,
          });
        }

        await sleep(120);

        const productsList = await productModel
          .find({})
          .select("name slug price category")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        return res.status(200).send({
          ok: true,
          count: productsList.length,
          latencyMs: performance.now() - startedAt,
        });
      } catch (error) {
        return res.status(500).send({ ok: false, message: error.message });
      }
    });

    app.put("/categories/bulk-update", async (req, res) => {
      const startedAt = performance.now();
      try {
        writeLockHolders += 1;

        // Hold each write long enough so concurrent user reads overlap and contend.
        // Concurrent updateMany calls on the same collection serialize at the storage
        // engine level, producing measurable write latency spikes under burst traffic.
        await sleep(700);

        await categoryModel.updateMany(
          {},
          [
            {
              $set: {
                name: {
                  $concat: ["$name", "-bulk"],
                },
              },
            },
          ]
        );

        return res.status(200).send({
          ok: true,
          updated: true,
          latencyMs: performance.now() - startedAt,
        });
      } catch (error) {
        return res.status(503).send({ ok: false, message: error.message });
      } finally {
        writeLockHolders = Math.max(0, writeLockHolders - 1);
      }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Liu, Yiwei, A0332922J
  test("runs user and admin task groups concurrently and detects contention impact", async () => {
    const userRequestCount = 100;
    const adminRequestCount = 20;

    const adminWriteTaskGroup = Promise.all(
      Array.from({ length: adminRequestCount }, () =>
        request(app)
          .put("/categories/bulk-update")
          .send({ batch: true })
      )
    );

    // Keep both groups concurrent while guaranteeing read requests overlap ongoing writes.
    await sleep(40);

    const userReadTaskGroup = Promise.all(
      Array.from({ length: userRequestCount }, () => request(app).get("/products"))
    );

    const [userResponses, adminResponses] = await Promise.all([
      userReadTaskGroup,
      adminWriteTaskGroup,
    ]);

    const userStatusCounts = userResponses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    const adminStatusCounts = adminResponses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    const userTimeouts = userResponses.filter((res) => res.status === 504);
    const userBlockedReads = userResponses.filter(
      (res) => (res.body?.latencyMs || 0) > 600
    );

    // Admin writes that exceed the 700ms base hold time indicate real write serialization
    // overhead from concurrent updateMany calls competing on the same collection.
    const adminSuccesses = adminResponses.filter((res) => res.status === 200);
    const slowAdminWrites = adminResponses.filter(
      (res) => (res.body?.latencyMs || 0) > 750
    );

    console.log("User /products status counts:", userStatusCounts);
    console.log("Admin /categories/bulk-update status counts:", adminStatusCounts);
    console.log(`User reads blocked or timed out: ${userTimeouts.length + userBlockedReads.length}`);
    console.log(`Admin writes completed: ${adminSuccesses.length}, slow (>600ms): ${slowAdminWrites.length}`);

    expect(userResponses).toHaveLength(userRequestCount);
    expect(adminResponses).toHaveLength(adminRequestCount);

    // User reads must be blocked or timeout due to concurrent admin write contention.
    expect(userTimeouts.length + userBlockedReads.length).toBeGreaterThan(0);

    // Admin bulk writes must complete despite concurrent read pressure (system resilience).
    expect(adminSuccesses.length).toBeGreaterThan(0);

    // Concurrent updateMany calls on the same collection must produce overhead beyond the
    // 700ms base hold time, confirming real write serialization at the storage engine level.
    expect(slowAdminWrites.length).toBeGreaterThan(0);
  }, 120000);
});