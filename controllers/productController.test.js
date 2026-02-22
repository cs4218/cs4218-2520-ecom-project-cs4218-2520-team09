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
// Mock braintree before importing for gateway
jest.mock("braintree", () => {
    const mockFn = { 
        generate: jest.fn(), 
        sale: jest.fn() 
    }

    mockFn.Environment = { Sandbox: "Sandbox" };
    mockFn.BraintreeGateway = jest.fn(() => ({
        clientToken: { generate: mockFn.generate },
        transaction: { sale: mockFn.sale }
    }));

    return mockFn;
});
  
import {
    getProductController,
    getSingleProductController,
    productPhotoController,
    productFiltersController,
    productCountController,
    productListController,
    searchProductController,
    relatedProductController,
    productCategoryController,
    brainTreeTokenController,
    brainTreePaymentController,
} from '../controllers/productController.js';

import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import braintree from "braintree";

// Mock dependencies
jest.mock('../models/productModel.js');
jest.mock('../models/categoryModel.js');
jest.mock('../models/orderModel.js');

// Chan Cheuk Hong John, A0253435H
describe('getProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should get all products if any exist', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500 },
            { _id: '2', name: 'Phone', price: 999 }
        ];

        // Chain mock functions
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue(mockProducts)
                    })
                })
            })
        });

        // Call the controller
        await getProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            countTotal: 2,
            message: 'All Products',
            products: mockProducts
        });
    });

    it('should get all products even if there are none', async () => {
        // Mock products
        const mockProducts = [];

        // Chain mock functions
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue(mockProducts)
                    })
                })
            })
        });

        // Call the controller
        await getProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            countTotal: 0,
            message: 'All Products',
            products: mockProducts
        });
    });

    it('should catch getProductController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Chain mock functions to throw error at the end
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        sort: jest.fn().mockRejectedValue(new Error('Error'))
                    })
                })
            })
        });

        // Call the controller
        await getProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: 'Error in getting products',
            error: new Error('Error')
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
})

describe('getSingleProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should get fetch single product', async () => {
        // Mock product
        const mockProduct = [
            { _id: '1', name: 'Laptop', price: 1500, slug: 'laptop' },
        ];

        req.params.slug = 'laptop'

        // Chain mock functions
        productModel.findOne = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockProduct)
            })
        });

        // Call the controller
        await getSingleProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: 'Single Product Fetched',
            product: mockProduct
        });
    });

    it('should should handle cases where product not found or fetched', async () => {
        // Mock product
        const mockProduct = [
            { _id: '1', name: 'Laptop', price: 1500, slug: 'laptop' },
        ];

        // Different slug from mock data
        req.params.slug = 'laptop'

        // Chain mock functions
        productModel.findOne = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(null) // Not found, return null
            })
        });

        // Call the controller
        await getSingleProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: 'Product not found',
        });
    });

    it('should catch getSingleProductController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Chain mock functions to return error
        productModel.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('Error'))
            })
        });

        // Call the controller
        await getSingleProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting a single product",
            error: new Error('Error')
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
})

describe('productPhotoController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { params: { pid: "1" } };
        res = {
            status: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    }); 

    it('should successfully fetch photo', async () => {
        // Mock data
        const mockPhoto = {
            photo: {
                data: Buffer.from("test"),
                contentType: "image/jpeg",
            },
        };

        // Mock function return
        productModel.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockPhoto),
        });
      
        // Call the controller
        await productPhotoController(req, res);

        // Expect correct returns
        expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockPhoto.photo.data);
    })

    it('should handle cases when findById returns null', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock function return
        productModel.findById.mockResolvedValue(null);
      
        // Call the controller
        await productPhotoController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting photo",
            error: expect.any(Error)
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })

    it('should handle cases when findById.select returns null', async () => {
        // Mock function return
        productModel.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });
      
        // Call the controller
        await productPhotoController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith("Product not found");
    })

    it('should handle cases when product.photo does not exist', async () => {
        // Mock data
        const mockPhoto = {};

        // Mock function return
        productModel.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockPhoto),
        });
      
        // Call the controller
        await productPhotoController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith("Product photo data not found");
    })

    it('should handle cases when product.photo.data does not exist', async () => {
        // Mock data
        const mockPhoto = {
            photo: {},
        };

        // Mock function return
        productModel.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockPhoto),
        });
      
        // Call the controller
        await productPhotoController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith("Product photo data not found");
    })
})

describe('productFiltersController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {
            checked: [],
            radio: []
            },  
            user: {} 
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should return all product if no filters applied', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' },
        ];

        // Mock return value
        productModel.find.mockResolvedValue(mockProducts);

        // Call the controller
        await productFiltersController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts,
        });        
    })

    it('should properly filter by category', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' },
        ];

        req.body.checked = ['Electronics'];

        // Mock return value
        productModel.find.mockResolvedValue(mockProducts.slice(0, 1));

        // Call the controller
        await productFiltersController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({ category: ['Electronics'] });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts.slice(0, 1),
        });        
    })

    it('should properly filter by price', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' },
        ];

        req.body.radio = [10, 20];

        // Mock return value
        productModel.find.mockResolvedValue(mockProducts[2]);

        // Call the controller
        await productFiltersController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({ price: { $gte: 10, $lte: 20} });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts[2],
        });        
    })

    it('should properly filter by both category and price', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' },
        ];

        req.body.checked = ['Electronics']
        req.body.radio = [800, 1000];

        // Mock return value
        productModel.find.mockResolvedValue(mockProducts[1]);

        // Call the controller
        await productFiltersController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({ category: ['Electronics'], price: { $gte: 800, $lte: 1000} });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts[1],
        });        
    })

    it('should catch productFiltersController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock error return
        productModel.find.mockRejectedValue(new Error('Error'));

        // Call the controller
        await productFiltersController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Filtering Products",
            error: new Error('Error')
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
})

describe('productCountController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should successfully return total', async () => {
        // Mock data
        const mockTotal = 10;

        // Chain mock function
        const findMock = { estimatedDocumentCount: jest.fn().mockResolvedValue(mockTotal) };
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await productCountController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            total: 10,
        });
    })

    it('should handle cases when find returns null', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Chain mock function
        productModel.find.mockReturnValue(null);

        // Call the controller
        await productCountController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in product count",
            error: expect.any(Error)
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

describe('productListController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should fetch items on default page (1) if not provided', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500 },
            { _id: '2', name: 'Phone', price: 999 }
        ];

        // Mock chain
        const findMock = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProducts),
          };
      
        productModel.find.mockReturnValue(findMock);      
        
        // Call the controller
        await productListController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts,
        });        
    })

    it('should fetch items on specific page if provided', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500 },
            { _id: '2', name: 'Phone', price: 999 }
        ];

        req.params.page = 5;

        // Mock chain
        const findMock = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProducts),
          };
      
        productModel.find.mockReturnValue(findMock);      
        
        // Call the controller
        await productListController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts,
        });        
    })

    it('should catch productListController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock chain
        const findMock = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockRejectedValue(new Error('Error')),
          };
      
        productModel.find.mockReturnValue(findMock);      
        
        // Call the controller
        await productListController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in per page controller",
            error: new Error('Error')
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

describe('searchProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should return products matching keyword', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, description: "A laptop" },
            { _id: '2', name: 'Phone', price: 999, description: "A phone" }
        ];

        req.params = { keyword: "laptop" };

        // Mock chain
        const findMock = { select: jest.fn().mockResolvedValue(mockProducts) };
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await searchProductController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: "laptop", $options: "i" } },
                { description: { $regex: "laptop", $options: "i" } },
              ]
        });
        expect(findMock.select).toHaveBeenCalledWith('-photo');
        expect(res.json).toHaveBeenCalledWith(mockProducts);    
    })

    it('should return no products if keyword does not match', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, description: "A laptop" },
            { _id: '2', name: 'Phone', price: 999, description: "A phone" }
        ];

        req.params = { keyword: "potato" };

        // Mock chain
        const findMock = { select: jest.fn().mockResolvedValue([]) };
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await searchProductController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: "potato", $options: "i" } },
                { description: { $regex: "potato", $options: "i" } },
              ]
        });
        expect(findMock.select).toHaveBeenCalledWith('-photo');
        expect(res.json).toHaveBeenCalledWith([]);    
    })

    it('should catch searchProductController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        req.params = { keyword: "" };

        // Mock chain
        const findMock = { select: jest.fn().mockRejectedValue(new Error('Error')) };
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await searchProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: 'Error In Search Product API',
            error: new Error('Error')
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

describe('relatedProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {}, params: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should return related products if any', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' }
        ];

        req.params.pid = 1;
        req.params.cid = 'Electronics';

        // Mock chain
        const findMock = {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue(mockProducts.slice(0, 1)),
        };
    
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await relatedProductController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({
            category: 'Electronics',
            _id: { $ne: 1 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts.slice(0, 1),
        });
    })

    it('should return no related products if none', async () => {
        // Mock products
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' }
        ];

        req.params.pid = 1;
        req.params.cid = 'Potato';

        // Mock chain
        const findMock = {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue([]),
        };
    
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await relatedProductController(req, res);

        // Expect correct returns
        expect(productModel.find).toHaveBeenCalledWith({
            category: 'Potato',
            _id: { $ne: 1 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: [],
        });
    })

    it('should catch relatedProductController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        req.params.pid = 1;
        req.params.cid = 'Electronics';

        // Mock chain
        const findMock = {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockRejectedValue(new Error('Error')),
        };
    
        productModel.find.mockReturnValue(findMock);

        // Call the controller
        await relatedProductController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: 'Error while getting related product',
            error: new Error('Error')
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

describe('productCategoryController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should get product by category successfully', async () => {
        // Mock data
        req.params = { slug: 'Electronics' };
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' }
        ];

        // Mock returns
        categoryModel.findOne = jest.fn().mockResolvedValue("Electronics");
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockProducts.slice(0, 1)),
        });

        // Call the controller
        await productCategoryController(req, res);

        // Expect correct returns
        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'Electronics' });
        expect(productModel.find).toHaveBeenCalledWith({ category: 'Electronics' });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: 'Electronics',
            products: mockProducts.slice(0, 1)
        });
    })

    it('should handle cases when categoryModel.findOne returns null', async () => {
        // Mock returns
        req.params = { slug: "test" };
        categoryModel.findOne = jest.fn().mockResolvedValue(null);

        // Call the controller
        await productCategoryController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Category not found",
        });
    })

    it('should handle cases when category found but no products', async () => {
        // Mock data
        req.params = { slug: 'Test' };
        const mockProducts = [
            { _id: '1', name: 'Laptop', price: 1500, category: 'Electronics' },
            { _id: '2', name: 'Phone', price: 999, category: 'Electronics' },
            { _id: '3', name: 'Novel', price: 15, category: 'Book' }
        ];

        // Mock returns
        categoryModel.findOne = jest.fn().mockResolvedValue('Test');
        productModel.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([]),
        });

        // Call the controller
        await productCategoryController(req, res);

        // Expect correct returns
        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "Test" });
        expect(productModel.find).toHaveBeenCalledWith({ category: 'Test' });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: 'Test',
            products: []
        });
    })

    it('should catch productCategoryController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock data
        req.params = { slug: 'Test' };

        // Mock returns
        categoryModel.findOne = jest.fn().mockRejectedValue(new Error('Error'));

        // Call the controller
        await productCategoryController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: new Error('Error'),
            message: "Error while getting products",
        });

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

describe('brainTreeTokenController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should successfully generate token', async () => {
        // Mock response data
        const mockResponse = { clientToken: "test" };
    
        // Mock implementation for callback
        braintree.generate.mockImplementation((opts, cb) => {
            cb(null, mockResponse)
        });

        // Call the controller
        await brainTreeTokenController(req, res);

        // Expect correct returns
        expect(res.send).toHaveBeenCalledWith(mockResponse);
        expect(res.status).not.toHaveBeenCalled();
    })

    it('should handle errors from generate', async () => {    
        // Mock implementation for callback
        braintree.generate.mockImplementation((opts, callback) => {
            callback(new Error('Error'));
        });

        // Call the controller
        await brainTreeTokenController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(new Error('Error'));
    })

    it('should catch brainTreeTokenController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock to throw error
        braintree.generate.mockImplementation(() => {
            throw error;
        });

        // Call the controller
        await brainTreeTokenController(req, res);

        // Expect correct returns
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

describe('brainTreePaymentController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { body: {},  user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    }); 

    it('should successfully create payment', async () => {
        // Mock data
        req.body = {
            nonce: "test",
            cart: [{ price: 100 }, { price: 50 }, { price: 25 },]
        }

        // Mock implementation for callback
        const mockTransactionResult = { success: true, transaction: { id: "test" } };
        braintree.sale.mockImplementation((opts, callback) => {
            callback(null, mockTransactionResult);
        });

        // Call the controller
        await brainTreePaymentController(req, res);

        // Expect correct returns
        expect(braintree.sale).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 175 }),
            expect.any(Function)
        );
        expect(res.json).toHaveBeenCalledWith({ ok: true });
        expect(res.status).not.toHaveBeenCalled();
    })

    it('should handle payment errors', async () => {
        // Mock data
        req.body = {
            nonce: "test",
            cart: [{ price: 100 }, { price: 50 }, { price: 25 },]
        }

        // Mock implementation for callback
        braintree.sale.mockImplementation((opts, callback) => {
            callback(new Error('Error'));
        });

        // Call the controller
        await brainTreePaymentController(req, res);

        // Expect correct returns
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(new Error('Error'));
    })

    it('should catch brainTreePaymentController errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock data
        req.body = {
            nonce: "test",
            cart: [{ price: 100 }, { price: 50 }, { price: 25 },]
        }

        // Mock implementation for callback
        const mockTransactionResult = { success: true, transaction: { id: "test" } };
        braintree.sale.mockImplementation((opts, callback) => {
            throw error;
        });

        // Call the controller
        await brainTreePaymentController(req, res);

        // Expect correct returns
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    })
})

// TODO 
// create/delete/updateProductController
