/*
Bottom-Up Integration Testing:
This suite validates integration from Express route handlers (registerController)
down to the real Mongoose userModel using mongodb-memory-server.
No mocking is used for userModel; the tests exercise actual
controller-model-database data flow against an in-memory MongoDB instance.
*/

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { registerController } from "../../controllers/authController.js";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Zhu Shiqi, A0271719X
describe("Bottom-Up integration: registerController + userModel + MongoDB", () => {
  let req, res;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "register-integration",
    });
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it("saves user with hashed password when all fields are valid", async () => {
    const plainPassword = "myPlainPassword";

    req.body = {
      name: "Jane Doe",
      email: "jane@example.com",
      password: plainPassword,
      phone: "1234567890",
      address: "456 Avenue",
      answer: "Tennis",
    };

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const response = res.send.mock.calls[0][0];
    expect(response.success).toBe(true);

    // Verify the password is stored as a bcrypt hash, not plaintext, in the real DB
    const saved = await userModel.findOne({ email: "jane@example.com" });
    expect(saved).not.toBeNull();
    expect(saved.password).not.toBe(plainPassword);
    expect(saved.password).toMatch(/^\$2b\$/);
  });

  it("returns error when email already exists in the database", async () => {
    // Seed a real duplicate user directly into the in-memory DB
    await new userModel({
      name: "Existing User",
      email: "existing@example.com",
      password: await hashPassword("password123"),
      phone: "1234567890",
      address: "123 Street",
      answer: "Football",
    }).save();

    req.body = {
      name: "Jane Doe",
      email: "existing@example.com",
      password: "password123",
      phone: "1234567890",
      address: "456 Avenue",
      answer: "Tennis",
    };

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Already Register please login",
      })
    );

    // Confirm still only one user persisted in the DB
    const count = await userModel.countDocuments({ email: "existing@example.com" });
    expect(count).toBe(1);
  });

  it.each([
    [
      { email: "a@b.com", password: "pass", phone: "123", address: "addr", answer: "ans" },
      { error: "Name is Required" },
    ],
    [
      { name: "Jane", password: "pass", phone: "123", address: "addr", answer: "ans" },
      { message: "Email is Required" },
    ],
    [
      { name: "Jane", email: "a@b.com", phone: "123", address: "addr", answer: "ans" },
      { message: "Password is Required" },
    ],
    [
      { name: "Jane", email: "a@b.com", password: "pass", address: "addr", answer: "ans" },
      { message: "Phone no is Required" },
    ],
    [
      { name: "Jane", email: "a@b.com", password: "pass", phone: "123", answer: "ans" },
      { message: "Address is Required" },
    ],
    [
      { name: "Jane", email: "a@b.com", password: "pass", phone: "123", address: "addr" },
      { message: "Answer is Required" },
    ],
  ])("returns validation error for missing field (%o)", async (body, expectedResponse) => {
    req.body = body;

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith(expectedResponse);
    // Verify nothing was persisted to the real DB
    const count = await userModel.countDocuments({});
    expect(count).toBe(0);
  });

  // ─── Boundary Value Analysis: name field minimum character length ─────────────
  // The controller rejects registration when `name` is falsy (empty string).
  // Minimum valid length is 1 character.
  //
  // Three-Value BVA partitions the boundary at length = 1:
  //   min - 1 → "" (0 chars): just outside the valid partition  → REJECTED
  //   min     → "A" (1 char): exact lower boundary value        → ACCEPTED
  //   min + 1 → "AB" (2 chars): just inside the valid partition → ACCEPTED
  describe("BVA – name field minimum character length boundary", () => {
    const baseBody = {
      email: "bva@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 BVA Street",
      answer: "Tennis",
    };

    it("BVA min-1: name = '' (0 chars, just outside lower boundary) → rejected", async () => {
      req.body = { ...baseBody, name: "" };

      await registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(await userModel.countDocuments({})).toBe(0);
    });

    it("BVA min: name = 'A' (1 char, exact lower boundary) → accepted", async () => {
      req.body = { ...baseBody, name: "A" };

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = await userModel.findOne({ email: "bva@example.com" });
      expect(saved).not.toBeNull();
      expect(saved.name).toBe("A");
    });

    it("BVA min+1: name = 'AB' (2 chars, just inside valid partition) → accepted", async () => {
      req.body = { ...baseBody, name: "AB" };

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const saved = await userModel.findOne({ email: "bva@example.com" });
      expect(saved).not.toBeNull();
      expect(saved.name).toBe("AB");
    });
  });
});
