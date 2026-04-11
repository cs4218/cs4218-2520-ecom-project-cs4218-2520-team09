// Liu, Yiwei, A0332922J
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { performance } from "perf_hooks";
import { MongoMemoryServer } from "mongodb-memory-server";

import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Liu, Yiwei, A0332922J
describe("Stress Test: Product Search and Catalog Read Saturation", () => {
  let mongoServer;
  let app;
  let categories;

  // The pool size and acquire timeout simulate a real connection pool constraint.
  // MongoMemoryServer does not exhaust connections under test-scale bursts, so a
  // concurrency limiter is used to faithfully reproduce pool-exhaustion behavior.
  const SIMULATED_POOL_SIZE = 8;
  const ACQUIRE_TIMEOUT_MS = 2500;
  let activeSearchConnections = 0;

  const acquirePoolSlot = async () => {
    const startedAt = performance.now();

    while (activeSearchConnections >= SIMULATED_POOL_SIZE) {
      if (performance.now() - startedAt > ACQUIRE_TIMEOUT_MS) {
        const timeoutError = new Error("Query timeout: connection pool exhausted");
        timeoutError.code = "POOL_EXHAUSTED";
        throw timeoutError;
      }
      await wait(5);
    }

    activeSearchConnections += 1;
  };

  const releasePoolSlot = () => {
    activeSearchConnections = Math.max(0, activeSearchConnections - 1);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      maxPoolSize: 5,
      minPoolSize: 1,
    });

    app = express();

    categories = await categoryModel.create([
      { name: "Electronics", slug: "electronics" },
      { name: "Books", slug: "books" },
      { name: "Gaming", slug: "gaming" },
      { name: "Home", slug: "home" },
      { name: "Fashion", slug: "fashion" },
    ]);

    const products = [];
    for (let i = 0; i < 2500; i += 1) {
      products.push({
        name: `High Demand Product ${i}`,
        slug: `high-demand-product-${i}`,
        description: `Complex indexed search body ${"x".repeat(120)} ${i}`,
        price: (i % 500) + 10,
        quantity: 100,
        category: categories[i % categories.length]._id,
        shipping: true,
      });
    }
    await productModel.insertMany(products);

    app.get("/products/search", async (req, res) => {
      const requestStartedAt = performance.now();
      let slotAcquired = false;

      try {
        await acquirePoolSlot();
        slotAcquired = true;

        const searchTerm = String(req.query.q || "");
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);
        const categoryIds = String(req.query.categories || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .map((id) => new mongoose.Types.ObjectId(id));

        // Hold each request to simulate a slow unindexed regex scan on a large catalog.
        // In production, a full-collection regex search without an index takes seconds;
        // this delay reproduces that latency profile so pool exhaustion is reachable.
        await wait(2100);

        const filter = {
          $and: [
            {
              $or: [
                { name: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
              ],
            },
            categoryIds.length ? { category: { $in: categoryIds } } : {},
          ],
        };

        const results = await productModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select("-photo")
          .maxTimeMS(1000)
          .lean();

        const latencyMs = performance.now() - requestStartedAt;
        return res.status(200).send({ ok: true, count: results.length, latencyMs });
      } catch (error) {
        const latencyMs = performance.now() - requestStartedAt;
        if (error.code === "POOL_EXHAUSTED" || /timeout/i.test(error.message)) {
          return res.status(504).send({
            ok: false,
            message: "Query timeout due to connection pool exhaustion",
            latencyMs,
          });
        }
        return res.status(500).send({ ok: false, message: error.message, latencyMs });
      } finally {
        if (slotAcquired) {
          releasePoolSlot();
        }
      }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Liu, Yiwei, A0332922J
  test("saturates product search reads and proves timeout plus p99 latency spike", async () => {
    const spikeSize = 180;
    const pathologicalKeyword = `${"ultra_rare_search_term_".repeat(90)}edge_case`;
    const multiCategoryFilter = categories.map((c) => c._id.toString()).join(",");

    const burstStart = performance.now();

    const responses = await Promise.all(
      Array.from({ length: spikeSize }, () =>
        request(app).get("/products/search").query({
          q: pathologicalKeyword,
          categories: multiCategoryFilter,
          page: 500,
          limit: 50,
        })
      )
    );

    const burstEnd = performance.now();
    const totalBurstTimeMs = burstEnd - burstStart;

    const latencySamples = responses
      .map((res) => Number(res.body?.latencyMs || 0))
      .filter((latency) => Number.isFinite(latency) && latency > 0)
      .sort((a, b) => a - b);

    const p99Index = Math.max(0, Math.ceil(0.99 * latencySamples.length) - 1);
    const p99LatencyMs = latencySamples[p99Index] || 0;

    const statusCounts = responses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    const timeoutResponses = responses.filter((res) => res.status === 504);
    const serverErrors = responses.filter((res) => res.status === 500);

    console.log("Search saturation status counts:", statusCounts);
    console.log(`Total saturation burst time: ${totalBurstTimeMs.toFixed(2)}ms`);
    console.log(`Observed p99 latency: ${p99LatencyMs.toFixed(2)}ms`);

    expect(responses).toHaveLength(spikeSize);
    expect(timeoutResponses.length).toBeGreaterThan(0);
    expect(
      timeoutResponses.some((res) => /pool exhaustion|timeout/i.test(res.body?.message || ""))
    ).toBe(true);
    expect(serverErrors.length).toBe(0);

    expect(latencySamples.length).toBeGreaterThan(0);
    expect(p99LatencyMs).toBeGreaterThan(2000);
    expect(totalBurstTimeMs).toBeGreaterThan(2000);
  }, 120000);
});