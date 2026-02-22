import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { isAdmin, requireSignIn } from "./authMiddleware.js";

jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

// Unit tests for middlewares/authMiddleware.js
describe("authMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.JWT_SECRET = "secret";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("requireSignIn", () => {
    it("verifies JWT, attaches decoded user to req.user, and calls next", async () => {
      const next = jest.fn();
      const req = { headers: { authorization: "token" } };
      const res = {};
      JWT.verify.mockReturnValueOnce({ _id: "u1" });

      await requireSignIn(req, res, next);

      expect(JWT.verify).toHaveBeenCalledWith("token", "secret");
      expect(req.user).toEqual({ _id: "u1" });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("logs error when JWT.verify throws and does not call next", async () => {
      const next = jest.fn();
      const req = { headers: { authorization: "bad" } };
      const res = {};
      const err = new Error("invalid token");
      JWT.verify.mockImplementationOnce(() => {
        throw err;
      });

      await requireSignIn(req, res, next);

      expect(console.log).toHaveBeenCalledWith(err);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("isAdmin", () => {
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    it("returns 401 when user is not admin (role !== 1)", async () => {
      const next = jest.fn();
      const req = { user: { _id: "u1" } };
      const res = makeRes();
      userModel.findById.mockResolvedValueOnce({ role: 0 });

      await isAdmin(req, res, next);

      expect(userModel.findById).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next when user is admin (role === 1)", async () => {
      const next = jest.fn();
      const req = { user: { _id: "u1" } };
      const res = makeRes();
      userModel.findById.mockResolvedValueOnce({ role: 1 });

      await isAdmin(req, res, next);

      expect(userModel.findById).toHaveBeenCalledWith("u1");
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it("logs and responds 401 when userModel.findById throws", async () => {
      const next = jest.fn();
      const req = { user: { _id: "u1" } };
      const res = makeRes();
      const err = new Error("db down");
      userModel.findById.mockRejectedValueOnce(err);

      await isAdmin(req, res, next);

      expect(console.log).toHaveBeenCalledWith(err);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: err,
        message: "Error in admin middleware",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});


