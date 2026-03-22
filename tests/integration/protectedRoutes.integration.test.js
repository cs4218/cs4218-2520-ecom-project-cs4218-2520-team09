/**
 * Protected Routes — integration tests
 *
 * End-to-end checks for routes guarded by authMiddleware (requireSignIn, isAdmin),
 * using the real auth router, controllers, and bcrypt/JWT stack.
 *
 * MongoDB is replaced with mongodb-memory-server; authHelper and authMiddleware are not mocked.
 *
 * Jinhan Wu, A0266075Y
 */

import express from "express";
import mongoose from "mongoose";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import authRoutes from "../../routes/authRoute.js";
import userModel from "../../models/userModel.js";

let mongoMemoryServer;
let protectedRoutesApp;

function createProtectedRoutesApp() {
  const application = express();
  application.use(express.json());
  application.use("/api/v1/auth", authRoutes);
  return application;
}

describe("Protected Routes Integration Tests", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "protected-routes-test-jwt-secret-min-32-chars";

    mongoMemoryServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoMemoryServer.getUri());

    protectedRoutesApp = createProtectedRoutesApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoMemoryServer) await mongoMemoryServer.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  const sampleRegisteredUser = {
    name: "Protected Route Test User",
    email: "protected-routes-user@example.com",
    password: "correct-password-123",
    phone: "5550100",
    address: "1 Test Street",
    answer: "secret-answer",
  };

  it("user-protected route: valid JWT after login returns 200 and { ok: true } on GET /user-auth", async () => {
    await request(protectedRoutesApp)
      .post("/api/v1/auth/register")
      .send(sampleRegisteredUser)
      .expect(201);

    const loginResponse = await request(protectedRoutesApp)
      .post("/api/v1/auth/login")
      .send({
        email: sampleRegisteredUser.email,
        password: sampleRegisteredUser.password,
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.message).toMatch(/login successfully/i);
    expect(loginResponse.body.token).toBeTruthy();
    expect(typeof loginResponse.body.token).toBe("string");
    expect(loginResponse.body.user).toMatchObject({
      email: sampleRegisteredUser.email,
      name: sampleRegisteredUser.name,
    });
    expect(loginResponse.body.user.password).toBeUndefined();

    const jwtToken = loginResponse.body.token;

    const userAuthResponse = await request(protectedRoutesApp)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", jwtToken)
      .expect(200);

    expect(userAuthResponse.body).toEqual({ ok: true });
  });

  it("user-protected route: missing Authorization header returns 401", async () => {
    const response = await request(protectedRoutesApp)
      .get("/api/v1/auth/user-auth")
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/unauthorized/i);
  });

  it("user-protected route: malformed JWT returns 401", async () => {
    const response = await request(protectedRoutesApp)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", "not-a-valid-jwt")
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it("user-protected route: expired JWT returns 401", async () => {
    const expiredJwt = JWT.sign(
      {
        _id: new mongoose.Types.ObjectId().toString(),
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      process.env.JWT_SECRET
    );

    await request(protectedRoutesApp)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", expiredJwt)
      .expect(401);
  });

  it("admin-protected route: non-admin JWT returns 401; after role promotion returns 200", async () => {
    await request(protectedRoutesApp)
      .post("/api/v1/auth/register")
      .send(sampleRegisteredUser)
      .expect(201);

    const loginResponse = await request(protectedRoutesApp)
      .post("/api/v1/auth/login")
      .send({
        email: sampleRegisteredUser.email,
        password: sampleRegisteredUser.password,
      })
      .expect(200);

    const jwtToken = loginResponse.body.token;

    const nonAdminResponse = await request(protectedRoutesApp)
      .get("/api/v1/auth/admin-auth")
      .set("Authorization", jwtToken)
      .expect(401);

    expect(nonAdminResponse.body.success).toBe(false);
    expect(nonAdminResponse.body.message).toMatch(/unauthorized access/i);

    await userModel.updateOne(
      { email: sampleRegisteredUser.email },
      { $set: { role: 1 } }
    );

    const adminAuthResponse = await request(protectedRoutesApp)
      .get("/api/v1/auth/admin-auth")
      .set("Authorization", jwtToken)
      .expect(200);

    expect(adminAuthResponse.body).toEqual({ ok: true });
  });

  it("stateless JWT: repeated access to user-protected route with same token stays 200 (no server revocation)", async () => {
    await request(protectedRoutesApp)
      .post("/api/v1/auth/register")
      .send(sampleRegisteredUser)
      .expect(201);

    const loginResponse = await request(protectedRoutesApp)
      .post("/api/v1/auth/login")
      .send({
        email: sampleRegisteredUser.email,
        password: sampleRegisteredUser.password,
      })
      .expect(200);

    const jwtToken = loginResponse.body.token;

    await request(protectedRoutesApp)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", jwtToken)
      .expect(200);

    await request(protectedRoutesApp)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", jwtToken)
      .expect(200);
  });
});
