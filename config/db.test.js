import mongoose from "mongoose";
import connectDB from "./db.js";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("mongoose", () => ({
  connect: jest.fn(),
}));

describe("connectDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.MONGO_URL = "mongodb://test-url";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("logs success message when connection succeeds", async () => {
    mongoose.connect.mockResolvedValueOnce({
      connection: { host: "localhost" },
    });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test-url");
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("logs error message when connection fails", async () => {
    const error = new Error("failed");
    mongoose.connect.mockRejectedValueOnce(error);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test-url");
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls[0][0]).toEqual(
      expect.stringContaining("Error in Mongodb")
    );
  });
});


