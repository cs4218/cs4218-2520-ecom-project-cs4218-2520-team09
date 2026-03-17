/*
Bottom-Up Integration Testing:
This suite validates integration from Express route handlers (categoryController)
down to the real Mongoose categoryModel using mongodb-memory-server.
No mocking is used for categoryModel or slugify; the tests exercise actual
controller-model-database data flow against an in-memory MongoDB instance.
*/

import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  createCategoryController,
  updateCategoryController,
  categoryController,
  deleteCategoryController,
} from "../../controllers/categoryController.js";
import categoryModel from "../../models/categoryModel.js";

describe("Bottom-Up integration: categoryController + categoryModel + MongoDB", () => {
  let app;
  let mongoServer;
  let consoleLogSpy;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "category-controller-integration",
    });

    app = express();
    app.use(express.json());

    app.post("/api/categories", createCategoryController);
    app.put("/api/categories/:id", updateCategoryController);
    app.get("/api/categories", categoryController);
    app.delete("/api/categories/:id", deleteCategoryController);
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(async () => {
    consoleLogSpy.mockRestore();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Liu, Yiwei, A0332922J
  describe("createCategoryController", () => {
    it("creates category and persists slug in DB", async () => {
      const response = await request(app)
        .post("/api/categories")
        .send({ name: "Home Appliances" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("new category created");
      expect(response.body.category.name).toBe("Home Appliances");
      expect(response.body.category.slug).toBe("home-appliances");

      const saved = await categoryModel.findOne({ name: "Home Appliances" });
      expect(saved).not.toBeNull();
      expect(saved.slug).toBe("home-appliances");
    });

    it("returns 401 when name is missing", async () => {
      const response = await request(app).post("/api/categories").send({});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Name is required" });
    });

    it("returns exists message when category name already exists", async () => {
      await categoryModel.create({ name: "Electronics", slug: "electronics" });

      const response = await request(app)
        .post("/api/categories")
        .send({ name: "Electronics" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Category Already Exists");

      const all = await categoryModel.find({ name: "Electronics" });
      expect(all).toHaveLength(1);
    });

    it("returns 500 when DB connection is unavailable", async () => {
      await mongoose.connection.close();

      const response = await request(app)
        .post("/api/categories")
        .send({ name: "Network Devices" });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Error in Category");

      await mongoose.connect(mongoServer.getUri(), {
        dbName: "category-controller-integration",
      });
    });
  });

  // Liu, Yiwei, A0332922J
  describe("updateCategoryController", () => {
    it("updates category name and slug in DB", async () => {
      const existing = await categoryModel.create({ name: "Books", slug: "books" });

      const response = await request(app)
        .put(`/api/categories/${existing._id}`)
        .send({ name: "Science Books" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Category Updated Successfully");
      expect(response.body.category.name).toBe("Science Books");
      expect(response.body.category.slug).toBe("science-books");

      const updated = await categoryModel.findById(existing._id);
      expect(updated.name).toBe("Science Books");
      expect(updated.slug).toBe("science-books");
    });

    it("returns 500 for invalid category id", async () => {
      const response = await request(app)
        .put("/api/categories/not-a-valid-objectid")
        .send({ name: "Anything" });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Error while updating category");
    });
  });

  // Liu, Yiwei, A0332922J
  describe("categoryController (get all)", () => {
    it("returns all categories from real DB", async () => {
      await categoryModel.create([
        { name: "Gaming", slug: "gaming" },
        { name: "Fashion", slug: "fashion" },
      ]);

      const response = await request(app).get("/api/categories");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("All Categories List");
      expect(response.body.category).toHaveLength(2);

      const names = response.body.category.map((cat) => cat.name).sort();
      expect(names).toEqual(["Fashion", "Gaming"]);
    });

    it("returns 500 when DB connection is unavailable", async () => {
      await mongoose.connection.close();

      const response = await request(app).get("/api/categories");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Error while getting all categories");

      await mongoose.connect(mongoServer.getUri(), {
        dbName: "category-controller-integration",
      });
    });
  });

  // Liu, Yiwei, A0332922J
  describe("deleteCategoryController", () => {
    it("deletes category from real DB", async () => {
      const existing = await categoryModel.create({ name: "Toys", slug: "toys" });

      const response = await request(app).delete(`/api/categories/${existing._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Category Deleted Successfully");

      const deleted = await categoryModel.findById(existing._id);
      expect(deleted).toBeNull();
    });

    it("returns 500 for invalid category id", async () => {
      const response = await request(app).delete("/api/categories/not-a-valid-objectid");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("error while deleting category");
    });
  });
});
