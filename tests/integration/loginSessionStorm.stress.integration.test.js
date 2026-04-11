// Liu, Yiwei, A0332922J
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { performance } from "perf_hooks";
import { MongoMemoryServer } from "mongodb-memory-server";

import { loginController } from "../../controllers/authController.js";
import { requireSignIn } from "../../middlewares/authMiddleware.js";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Liu, Yiwei, A0332922J
describe("Stress Test: Concurrent User Login and Session Storm", () => {
  let mongoServer;
  let app;

  // Small in-memory limiter to force overload behavior in the stress harness.
  const RATE_LIMIT_WINDOW_MS = 1000;
  const RATE_LIMIT_MAX = 220;
  let rateWindowStart = 0;
  let rateCount = 0;

  beforeAll(async () => {
    process.env.JWT_SECRET = "stress-test-secret";

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const validHashedPassword = await hashPassword("valid-password");
    await userModel.create({
      name: "Stress User",
      email: "stress.user@example.com",
      password: validHashedPassword,
      phone: "123456789",
      address: "Stress Lane",
      answer: "stress-answer",
      role: 0,
    });

    app = express();
    app.use(express.json());

    app.post("/login", (req, res, next) => {
      const now = Date.now();
      if (now - rateWindowStart > RATE_LIMIT_WINDOW_MS) {
        rateWindowStart = now;
        rateCount = 0;
      }

      rateCount += 1;
      if (rateCount > RATE_LIMIT_MAX) {
        return res.status(429).send({
          success: false,
          message: "Too Many Requests",
        });
      }

      return next();
    }, loginController);

    app.get("/user-auth", requireSignIn, (req, res) => {
      res.status(200).send({ ok: true });
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Liu, Yiwei, A0332922J
  test("handles 500 concurrent login attempts with mixed credentials and session storm checks", async () => {
    const totalRequests = 500;
    const validRequests = Math.floor(totalRequests * 0.7);
    const invalidRequests = totalRequests - validRequests;

    const validPayloads = Array.from({ length: validRequests }, () => ({
      email: "stress.user@example.com",
      password: "valid-password",
    }));

    const invalidPayloads = Array.from({ length: invalidRequests }, () => ({
      email: "stress.user@example.com",
      password: "invalid-password",
    }));

    const mixedPayloads = [...validPayloads, ...invalidPayloads]
      .map((payload) => ({ payload, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((item) => item.payload);

    const startTimeMs = performance.now();

    const loginResponses = await Promise.all(
      mixedPayloads.map((payload) => request(app).post("/login").send(payload))
    );

    const endTimeMs = performance.now();
    const totalExecutionTimeMs = endTimeMs - startTimeMs;

    const statusCounts = loginResponses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    const tooManyRequestsCount = loginResponses.filter((res) => res.status === 429).length;
    const loginServerErrorCount = loginResponses.filter((res) => res.status === 500).length;

    console.log("Login stress status counts:", statusCounts);
    console.log(`Total login burst execution time: ${totalExecutionTimeMs.toFixed(2)}ms`);

    expect(loginResponses).toHaveLength(totalRequests);
    expect(tooManyRequestsCount).toBeGreaterThan(0);
    expect(loginServerErrorCount).toBe(0);
    expect(totalExecutionTimeMs).toBeGreaterThan(0);

    const successfulTokens = loginResponses
      .filter((res) => res.status === 200 && res.body?.success === true && res.body?.token)
      .map((res) => res.body.token);

    const authProbeTokens = successfulTokens.slice(0, 100);

    const authResponses = await Promise.all(
      authProbeTokens.map((token) =>
        request(app)
          .get("/user-auth")
          .set("Authorization", token)
      )
    );

    const authServerErrorCount = authResponses.filter((res) => res.status === 500).length;
    const authOkOrUnauthorized = authResponses.every((res) => res.status === 200 || res.status === 401);

    console.log(
      `Auth middleware probe count: ${authResponses.length}, 500 errors: ${authServerErrorCount}`
    );

    expect(authResponses.length).toBeGreaterThan(0);
    expect(authServerErrorCount).toBe(0);
    expect(authOkOrUnauthorized).toBe(true);
  }, 120000);
});