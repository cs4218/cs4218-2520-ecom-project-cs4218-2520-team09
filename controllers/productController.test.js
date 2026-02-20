// Liu, Yiwei, A0332922J
import {
  createProductController,
  deleteProductController,
  updateProductController,
} from "../controllers/productController.js";
import productModel from "../models/productModel.js";
import fs from "fs";

jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "sandbox" },
  };
});

jest.mock("../models/productModel.js");
jest.mock("fs");
jest.mock("slugify", () => jest.fn((str) => `${str}-slug`));

// Liu, Yiwei, A0332922J
describe("Test for Admin View Products Features", () => {
  let req, res;
  let chainMock;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      fields: {},
      files: {},
      params: {},
      body: {},
      user: { _id: "user123" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      set: jest.fn(),
    };

    jest.spyOn(console, "log").mockImplementation(() => { });

    chainMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      estimatedDocumentCount: jest.fn().mockResolvedValue(0),
      then: jest.fn((resolve) => resolve([])),
    };
  });

  const validationCases = [
    { field: "name", errorMsg: "Name is Required" },
    { field: "description", errorMsg: "Description is Required" },
    { field: "price", errorMsg: "Price is Required" },
    { field: "category", errorMsg: "Category is Required" },
    { field: "quantity", errorMsg: "Quantity is Required" },
  ];

  // Liu, Yiwei, A0332922J
  describe("createProductController", () => {
    // Liu, Yiwei, A0332922J
    validationCases.forEach(({ field, errorMsg }) => {
      test(`should return 500 if ${field} is missing`, async () => {
        req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
        delete req.fields[field];
        await createProductController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: errorMsg });
      });
    });
    // Liu, Yiwei, A0332922J
    test("should return 500 if photo size > 1MB", async () => {
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      req.files = { photo: { size: 1000001 } };
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
    // Liu, Yiwei, A0332922J
    test("should create product successfully with photo", async () => {
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      req.files = { photo: { size: 1000, path: "/path", type: "img/jpg" } };
      const mockSave = jest.fn().mockResolvedValue(true);
      productModel.mockImplementation(() => ({ photo: {}, save: mockSave }));
      fs.readFileSync.mockReturnValue("buffer");

      await createProductController(req, res);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
    // Liu, Yiwei, A0332922J
    test("should create product successfully without photo", async () => {
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      req.files = {};
      const mockSave = jest.fn().mockResolvedValue(true);
      productModel.mockImplementation(() => ({ save: mockSave }));

      await createProductController(req, res);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
    // Liu, Yiwei, A0332922J
    test("should cover catch block on error", async () => {
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      productModel.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(new Error("DB Error")) }));
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // Liu, Yiwei, A0332922J
  describe("deleteProductController", () => {
    // Liu, Yiwei, A0332922J
    test("should delete product", async () => {
      productModel.findByIdAndDelete = jest.fn().mockReturnValue(chainMock);
      await deleteProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    // Liu, Yiwei, A0332922J
    test("should cover catch block", async () => {
      productModel.findByIdAndDelete = jest.fn().mockImplementation(() => { throw new Error(); });
      await deleteProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // Liu, Yiwei, A0332922J
  describe("updateProductController", () => {
    validationCases.forEach(({ field, errorMsg }) => {
      // Liu, Yiwei, A0332922J
      test(`should return 500 if ${field} is missing in update`, async () => {
        req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
        delete req.fields[field];
        await updateProductController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: errorMsg });
      });
    });

    test("should fail validation if photo > 1mb", async () => {
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      req.files = { photo: { size: 1000001 } };
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test("should update successfully with photo", async () => {
      req.params.pid = "123";
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      req.files = { photo: { size: 1000, path: "/path", type: "img" } };

      const mockProduct = { photo: {}, save: jest.fn().mockResolvedValue(true) };
      productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);
      fs.readFileSync.mockReturnValue("buf");

      await updateProductController(req, res);
      expect(mockProduct.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should update successfully without photo", async () => {
      req.params.pid = "123";
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      req.files = {};

      const mockProduct = { save: jest.fn().mockResolvedValue(true) };
      productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);

      await updateProductController(req, res);
      expect(mockProduct.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test("should cover catch block", async () => {
      req.fields = { name: "N", description: "D", price: 1, category: "C", quantity: 1 };
      productModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error());
      await updateProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});