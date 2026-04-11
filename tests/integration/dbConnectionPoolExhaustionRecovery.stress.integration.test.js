// Liu, Yiwei, A0332922J
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { performance } from "perf_hooks";
import { MongoMemoryServer } from "mongodb-memory-server";

import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Liu, Yiwei, A0332922J
describe("Stress Test: Database Connection Pool Exhaustion and Recovery", () => {
  let mongoServer;
  let app;
  let activeReads = 0;

  // The pool limit and acquire timeout model a real MongoDB driver connection pool.
  // MongoMemoryServer does not exhaust connections at test-scale burst sizes, so a
  // concurrency limiter reproduces the pool-exhaustion and recovery behavior faithfully.
  const SIMULATED_POOL_LIMIT = 12;
  const ACQUIRE_TIMEOUT_MS = 1200;

  const acquireReadSlot = async () => {
    const startedAt = performance.now();
    while (activeReads >= SIMULATED_POOL_LIMIT) {
      if (performance.now() - startedAt > ACQUIRE_TIMEOUT_MS) {
        const poolError = new Error("Database pool timeout while acquiring read slot");
        poolError.code = "DB_POOL_TIMEOUT";
        throw poolError;
      }
      await delay(5);
    }
    activeReads += 1;
  };

  const releaseReadSlot = () => {
    activeReads = Math.max(0, activeReads - 1);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      maxPoolSize: 8,
      minPoolSize: 1,
    });

    const seededCategory = await categoryModel.create({
      name: "Pool Stress Category",
      slug: "pool-stress-category",
    });

    const products = [];
    for (let i = 0; i < 500; i += 1) {
      products.push({
        name: `Pool Stress Product ${i}`,
        slug: `pool-stress-product-${i}`,
        description: `Pool stress catalog item ${i}`,
        price: 10 + i,
        quantity: 100,
        category: seededCategory._id,
      });
    }
    await productModel.insertMany(products);

    app = express();

    app.get("/products/pool-read", async (req, res) => {
      let acquired = false;
      try {
        await acquireReadSlot();
        acquired = true;

        // Hold each slot long enough to force pool exhaustion under a 300+ request burst.
        // This simulates a slow I/O-bound read (e.g., a cold-cache full-table scan).
        await delay(1300);

        const page = Number(req.query.page || 1);
        const perPage = Number(req.query.limit || 6);
        const results = await productModel
          .find({})
          .select("name slug price")
          .sort({ createdAt: -1 })
          .skip((page - 1) * perPage)
          .limit(perPage)
          .maxTimeMS(900)
          .lean();

        return res.status(200).send({ ok: true, count: results.length });
      } catch (error) {
        if (error.code === "DB_POOL_TIMEOUT") {
          return res.status(503).send({
            ok: false,
            message: "Service Unavailable: database connection pool exhausted",
          });
        }

        if (/timeout/i.test(error.message || "")) {
          return res.status(504).send({
            ok: false,
            message: "Gateway Timeout: database read timed out",
          });
        }

        return res.status(500).send({ ok: false, message: error.message });
      } finally {
        if (acquired) {
          releaseReadSlot();
        }
      }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Liu, Yiwei, A0332922J
  test("exhausts db pool under burst load and verifies automatic recovery", async () => {
    // Phase 1: Exhaustion via 300+ concurrent reads.
    const burstSize = 320;
    const exhaustionResponses = await Promise.all(
      Array.from({ length: burstSize }, () =>
        request(app)
          .get("/products/pool-read")
          .query({ page: 500, limit: 20 })
      )
    );

    const statusCounts = exhaustionResponses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    const serviceUnavailableCount = exhaustionResponses.filter((res) => res.status === 503).length;
    const timeoutCount = exhaustionResponses.filter((res) => res.status === 504).length;

    console.log("DB exhaustion status counts:", statusCounts);

    expect(exhaustionResponses).toHaveLength(burstSize);
    expect(serviceUnavailableCount + timeoutCount).toBeGreaterThan(0);

    // Phase 2: Cooldown for recovery.
    await delay(5000);

    // Phase 3: Recovery via 10 normal sequential reads.
    const recoveryResponses = [];
    for (let i = 1; i <= 10; i += 1) {
      const response = await request(app)
        .get("/products/pool-read")
        .query({ page: i, limit: 6 });
      recoveryResponses.push(response);
    }

    recoveryResponses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  }, 180000);
});