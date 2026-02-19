// Liu, Yiwei, A0332922J
import {
  createProductController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  deleteProductController,
  updateProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
  braintreeTokenController,
  brainTreePaymentController,
} from "../controllers/productController.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import fs from "fs";
import braintree from "braintree";

jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("../models/orderModel.js");
jest.mock("fs");
jest.mock("slugify", () => jest.fn((str) => `${str}-slug`));

jest.mock("braintree", () => {
  const mockSale = jest.fn();
  const mockGenerate = jest.fn();
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      transaction: { sale: mockSale },
      clientToken: { generate: mockGenerate },
    })),
    Environment: { Sandbox: "sandbox" },
    __mockSale: mockSale,
    __mockGenerate: mockGenerate,
  };
});
// Liu, Yiwei, A0332922J
describe("Product Controllers - 100% Coverage Suite", () => {
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
  describe("getProductController", () => {
    // Liu, Yiwei, A0332922J
    test("should get products successfully", async () => {
      chainMock.then = jest.fn((resolve) => resolve([{ _id: "1" }]));
      productModel.find.mockReturnValue(chainMock);
      await getProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
    // Liu, Yiwei, A0332922J
    test("should cover catch block on error", async () => {
      productModel.find.mockImplementation(() => { throw new Error("DB Error"); });
      await getProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("getSingleProductController", () => {
    // Liu, Yiwei, A0332922J
    test("should get single product successfully", async () => {
      req.params.slug = "test-slug";
      chainMock.then = jest.fn((resolve) => resolve({ _id: "1" }));
      productModel.findOne = jest.fn().mockReturnValue(chainMock);
      await getSingleProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    // Liu, Yiwei, A0332922J
    test("should cover catch block on error", async () => {
      productModel.findOne = jest.fn().mockImplementation(() => { throw new Error(); });
      await getSingleProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("productPhotoController", () => {
    // Liu, Yiwei, A0332922J
    test("should send photo if it exists", async () => {
      req.params.pid = "123";
      chainMock.then = jest.fn((resolve) => resolve({ photo: { data: "buf", contentType: "img/png" } }));
      productModel.findById = jest.fn().mockReturnValue(chainMock);
      await productPhotoController(req, res);
      expect(res.set).toHaveBeenCalledWith("Content-type", "img/png");
      expect(res.status).toHaveBeenCalledWith(200);
    });
    // Liu, Yiwei, A0332922J
    test("should do nothing if photo data is missing", async () => {
      chainMock.then = jest.fn((resolve) => resolve({ photo: {} }));
      productModel.findById = jest.fn().mockReturnValue(chainMock);
      await productPhotoController(req, res);
      expect(res.status).not.toHaveBeenCalled();
    });
    // Liu, Yiwei, A0332922J
    test("should cover catch block on error", async () => {
      productModel.findById = jest.fn().mockImplementation(() => { throw new Error(); });
      await productPhotoController(req, res);
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
  // Liu, Yiwei, A0332922J
  describe("productFiltersController", () => {
    test("should apply filters successfully", async () => {
      req.body = { checked: ["cat1"], radio: [10, 100] };
      productModel.find = jest.fn().mockResolvedValue([{ _id: "1" }]);
      await productFiltersController(req, res);
      expect(productModel.find).toHaveBeenCalledWith({ category: ["cat1"], price: { $gte: 10, $lte: 100 } });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should not apply args if empty", async () => {
      req.body = { checked: [], radio: [] };
      productModel.find = jest.fn().mockResolvedValue([]);
      await productFiltersController(req, res);
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should cover catch block", async () => {
      req.body = { checked: [] };
      await productFiltersController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("productCountController", () => {
    test("should get product count", async () => {
      chainMock.estimatedDocumentCount.mockResolvedValue(5);
      productModel.find = jest.fn().mockReturnValue(chainMock);
      await productCountController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ success: true, total: 5 });
    });

    test("should cover catch block", async () => {
      productModel.find = jest.fn().mockImplementation(() => { throw new Error(); });
      await productCountController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("productListController", () => {
    test("should get product list with page param", async () => {
      req.params.page = 2;
      productModel.find = jest.fn().mockReturnValue(chainMock);
      await productListController(req, res);
      expect(chainMock.skip).toHaveBeenCalledWith(6);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should default to page 1", async () => {
      productModel.find = jest.fn().mockReturnValue(chainMock);
      await productListController(req, res);
      expect(chainMock.skip).toHaveBeenCalledWith(0);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should cover catch block", async () => {
      productModel.find = jest.fn().mockImplementation(() => { throw new Error(); });
      await productListController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("searchProductController", () => {
    test("should return search results", async () => {
      req.params.keyword = "test";
      chainMock.then = jest.fn((resolve) => resolve([{ name: "test" }]));
      productModel.find = jest.fn().mockReturnValue(chainMock);
      await searchProductController(req, res);
      expect(res.json).toHaveBeenCalledWith([{ name: "test" }]);
    });

    test("should cover catch block", async () => {
      productModel.find = jest.fn().mockImplementation(() => { throw new Error(); });
      await searchProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("realtedProductController", () => {
    test("should return related products", async () => {
      req.params = { pid: "1", cid: "2" };
      productModel.find = jest.fn().mockReturnValue(chainMock);
      await realtedProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should cover catch block", async () => {
      productModel.find = jest.fn().mockImplementation(() => { throw new Error(); });
      await realtedProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("productCategoryController", () => {
    test("should get products by category", async () => {
      categoryModel.findOne = jest.fn().mockResolvedValue({ _id: "c1" });
      productModel.find = jest.fn().mockReturnValue(chainMock);
      await productCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should cover catch block", async () => {
      categoryModel.findOne = jest.fn().mockRejectedValue(new Error());
      await productCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  // Liu, Yiwei, A0332922J
  describe("braintreeTokenController", () => {
    beforeEach(() => {
      braintree.__mockGenerate.mockClear();
    });

    test("should send token on success", async () => {
      braintree.__mockGenerate.mockImplementation((params, cb) => cb(null, "token_123"));
      await braintreeTokenController(req, res);
      expect(res.send).toHaveBeenCalledWith("token_123");
    });

    test("should send 500 on error", async () => {
      const error = new Error("Token error");
      braintree.__mockGenerate.mockImplementation((params, cb) => cb(error, null));
      await braintreeTokenController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(error);
    });

    test("should cover catch block", async () => {
      braintree.__mockGenerate.mockImplementation(() => { throw new Error(); });
      await braintreeTokenController(req, res);
      expect(console.log).toHaveBeenCalled();
    });
  });
  // Liu, Yiwei, A0332922J
  describe("brainTreePaymentController", () => {
    beforeEach(() => {
      braintree.__mockSale.mockClear();
    });

    test("should process payment successfully and save order", async () => {
      req.body = { nonce: "valid-nonce", cart: [{ price: 100 }] };
      braintree.__mockSale.mockImplementation((params, cb) => cb(null, { success: true }));

      const mockSave = jest.fn().mockResolvedValue(true);
      orderModel.mockImplementation(() => ({ save: mockSave }));

      await brainTreePaymentController(req, res);
      expect(mockSave).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("should return 500 if payment fails", async () => {
      req.body = { nonce: "invalid", cart: [] };
      const error = new Error("Payment fail");
      braintree.__mockSale.mockImplementation((params, cb) => cb(error, null));
      await brainTreePaymentController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(error);
    });

    test("should cover catch block", async () => {
      req.body = { nonce: "valid" };
      await brainTreePaymentController(req, res);
      expect(console.log).toHaveBeenCalled();
    });
  });
});