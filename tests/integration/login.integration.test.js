/*
Bottom-Up Integration Testing:
This suite validates integration from Express route handlers (loginController)
down to the real Mongoose userModel using mongodb-memory-server.
No mocking is used for userModel; the tests exercise actual
controller-model-database data flow against an in-memory MongoDB instance.
*/

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { loginController } from "../../controllers/authController.js";
import { requireSignIn } from "../../middlewares/authMiddleware.js";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Zhu Shiqi, A0271719X
describe("Bottom-Up integration: loginController + userModel + MongoDB", () => {
  let req, res;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "login-integration",
    });
    process.env.JWT_SECRET = "test-secret";
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

  it("rejects wrong password via real bcrypt comparison", async () => {
    const realHash = await hashPassword("correctPassword");
    await new userModel({
      name: "Test User",
      email: "test@example.com",
      password: realHash,
      phone: "1234567890",
      address: "123 Street",
      answer: "Football",
    }).save();

    req.body = { email: "test@example.com", password: "wrongPassword" };

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Invalid Password" })
    );
  });

  it("returns JWT token when password matches via real bcrypt", async () => {
    const realHash = await hashPassword("myPassword");
    await new userModel({
      name: "Test User",
      email: "test@example.com",
      password: realHash,
      phone: "1234567890",
      address: "123 Street",
      answer: "Football",
    }).save();

    req.body = { email: "test@example.com", password: "myPassword" };

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.send.mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.token).toBeDefined();
    expect(response.user).not.toHaveProperty("password");
  });

  it("returned JWT grants access to protected route", async () => {
    const realHash = await hashPassword("myPassword");
    await new userModel({
      name: "Test User",
      email: "test@example.com",
      password: realHash,
      phone: "1234567890",
      address: "123 Street",
      answer: "Football",
    }).save();

    req.body = { email: "test@example.com", password: "myPassword" };
    await loginController(req, res);

    const token = res.send.mock.calls[0][0].token;
    expect(token).toBeDefined();

    // Use the token to access a protected route via requireSignIn middleware
    const authReq = { headers: { authorization: token } };
    const authRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await requireSignIn(authReq, authRes, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 404 for unregistered email", async () => {
    // No user seeded — DB is empty, findOne will return null for real
    req.body = { email: "unknown@example.com", password: "somePassword" };

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Email is not registered" })
    );
  });

  it.each([
    [{ password: "pass" }, "missing email"],
    [{ email: "a@b.com" }, "missing password"],
    [{}, "missing both"],
  ])("returns 404 for missing credentials (%s)", async (body) => {
    req.body = body;

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Invalid email or password" })
    );
  });
});
