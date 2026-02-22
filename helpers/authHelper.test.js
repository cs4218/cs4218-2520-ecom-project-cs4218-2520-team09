import bcrypt from "bcrypt";
import { comparePassword, hashPassword } from "./authHelper.js";

jest.mock("bcrypt");

// Written by Wu Jinhan
// Student No: A0266075Y

// Unit tests for helpers/authHelper.js
describe("authHelper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("hashPassword", () => {
    it("hashes the password with saltRounds=10 and returns the hash", async () => {
      bcrypt.hash.mockResolvedValueOnce("hashed_pw");

      const out = await hashPassword("pw");

      expect(bcrypt.hash).toHaveBeenCalledWith("pw", 10);
      expect(out).toBe("hashed_pw");
    });

    it("logs and returns undefined when bcrypt.hash throws", async () => {
      const err = new Error("boom");
      bcrypt.hash.mockRejectedValueOnce(err);

      const out = await hashPassword("pw");

      expect(console.log).toHaveBeenCalledWith(err);
      expect(out).toBeUndefined();
    });
  });

  describe("comparePassword", () => {
    it("delegates to bcrypt.compare and returns its result", async () => {
      bcrypt.compare.mockResolvedValueOnce(true);

      const out = await comparePassword("pw", "hashed");

      expect(bcrypt.compare).toHaveBeenCalledWith("pw", "hashed");
      expect(out).toBe(true);
    });
  });
});


