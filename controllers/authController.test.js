import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from './authController.js'; 

import userModel from '../models/userModel.js';
import orderModel from "../models/orderModel.js";
import { hashPassword, comparePassword } from '../helpers/authHelper.js';
import JWT from 'jsonwebtoken';

// Mock dependencies
jest.mock('../models/userModel.js');
jest.mock('../models/orderModel.js');
jest.mock('../helpers/authHelper.js');
jest.mock('jsonwebtoken');

// Zhu Shiqi, A0271719X
describe('registerController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      user: {},
    };

    res = {
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should return error if name is missing', async () => {
    req.body = {
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith({ error: 'Name is Required' });
  });

  it('should return error if email is missing', async () => {
    req.body = {
      name: 'Test User',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith({ message: 'Email is Required' });
  });

  it('should return error if password is missing', async () => {
    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith({ message: 'Password is Required' });
  });

  it('should return error if phone is missing', async () => {
    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith({ message: 'Phone no is Required' });
  });

  it('should return error if address is missing', async () => {
    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      answer: 'Test Answer',
    };

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith({ message: 'Address is Required' });
  });

  it('should return error if answer is missing', async () => {
    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
    };

    await registerController(req, res);

    expect(res.send).toHaveBeenCalledWith({ message: 'Answer is Required' });
  });

  it('should return error if user already exists', async () => {
    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    userModel.findOne.mockResolvedValue({ email: 'test@example.com' });

    await registerController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Already Register please login',
    });
  });

  it('should successfully register a new user', async () => {
    const mockUser = {
      _id: '123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
    };

    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    userModel.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue('hashedPassword123');

    const mockSave = jest.fn().mockResolvedValue(mockUser);
    userModel.mockImplementation(() => ({
      save: mockSave,
    }));

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'User Register Successfully',
      user: mockUser,
    });
  });

  it('should handle errors during registration', async () => {
    req.body = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
      answer: 'Test Answer',
    };

    const mockError = new Error('Database error');
    userModel.findOne.mockRejectedValue(mockError);

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error in Registration',
      error: mockError,
    });
  });
});

describe('loginController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      user: {},
    };

    res = {
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should return error if email or password is missing', async () => {
    req.body = { email: 'test@example.com' };

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid email or password',
    });
  });

  it('should return error if user is not registered', async () => {
    req.body = {
      email: 'test@example.com',
      password: 'password123',
    };

    userModel.findOne.mockResolvedValue(null);

    await loginController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Email is not registered',
    });
  });

  it('should return error if password is invalid', async () => {
    const mockUser = {
      _id: '123',
      email: 'test@example.com',
      password: 'hashedPassword',
    };

    req.body = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    userModel.findOne.mockResolvedValue(mockUser);
    comparePassword.mockResolvedValue(false);

    await loginController(req, res);

    expect(comparePassword).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid Password',
    });
  });

  it('should successfully login user with valid credentials', async () => {
    const mockUser = {
      _id: '123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
      password: 'hashedPassword',
      role: 0,
    };

    req.body = {
      email: 'test@example.com',
      password: 'password123',
    };

    process.env.JWT_SECRET = 'test-secret';

    userModel.findOne.mockResolvedValue(mockUser);
    comparePassword.mockResolvedValue(true);
    JWT.sign.mockResolvedValue('mockToken123');

    await loginController(req, res);

    expect(JWT.sign).toHaveBeenCalledWith(
      { _id: mockUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'login successfully',
      user: {
        _id: mockUser._id,
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
        address: mockUser.address,
        role: mockUser.role,
      },
      token: 'mockToken123',
    });
  });

  it('should handle errors during login', async () => {
    req.body = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockError = new Error('Database error');
    userModel.findOne.mockRejectedValue(mockError);

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error in login',
      error: mockError,
    });
  });
});

describe('forgotPasswordController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      user: {},
    };

    res = {
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should return error if email is missing', async () => {
    req.body = {
      answer: 'Test Answer',
      newPassword: 'newPassword123',
    };

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: 'Email is required' });
  });

  it('should return error if answer is missing', async () => {
    req.body = {
      email: 'test@example.com',
      newPassword: 'newPassword123',
    };

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: 'answer is required' });
  });

  it('should return error if newPassword is missing', async () => {
    req.body = {
      email: 'test@example.com',
      answer: 'Test Answer',
    };

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: 'New Password is required' });
  });

  it('should return error if email or answer is wrong', async () => {
    req.body = {
      email: 'test@example.com',
      answer: 'Wrong Answer',
      newPassword: 'newPassword123',
    };

    userModel.findOne.mockResolvedValue(null);

    await forgotPasswordController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
      answer: 'Wrong Answer',
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Wrong Email Or Answer',
    });
  });

  it('should successfully reset password', async () => {
    const mockUser = {
      _id: '123',
      email: 'test@example.com',
      answer: 'Test Answer',
    };

    req.body = {
      email: 'test@example.com',
      answer: 'Test Answer',
      newPassword: 'newPassword123',
    };

    userModel.findOne.mockResolvedValue(mockUser);
    hashPassword.mockResolvedValue('hashedNewPassword123');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    await forgotPasswordController(req, res);

    expect(hashPassword).toHaveBeenCalledWith('newPassword123');
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser._id, {
      password: 'hashedNewPassword123',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Password Reset Successfully',
    });
  });

  it('should handle errors during password reset', async () => {
    req.body = {
      email: 'test@example.com',
      answer: 'Test Answer',
      newPassword: 'newPassword123',
    };

    const mockError = new Error('Database error');
    userModel.findOne.mockRejectedValue(mockError);

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong',
      error: mockError,
    });
  });
});

describe('testController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      user: {},
    };

    res = {
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should return "Protected Routes" message', () => {
    testController(req, res);

    expect(res.send).toHaveBeenCalledWith('Protected Routes');
  });

  it('should handle errors in testController', () => {
    const mockError = new Error('Test error');

    res.send.mockImplementationOnce(() => {
      throw mockError;
    });

    testController(req, res);

    expect(console.log).toHaveBeenCalledWith(mockError);
    expect(res.send).toHaveBeenCalledWith({ error: mockError });
  });
});

// Chan Cheuk Hong John, A0253435H
describe('updateProfileController', () => {
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

    it('should successfully update password if password is valid', async () => {
        // Mock old and new user data
        req.user._id = "test";
        req.body = { 
            password: "654321",
        }

        const existingUser = {
            name: "Old",
            password: "66666666",
            phone: "88888888",
            address: "Old"
        }

        const newUser = {
            name: "Old",
            password: "hashed",
            phone: "88888888",
            address: "Old"
        }

        // Mock fn calls
        userModel.findById.mockResolvedValue(existingUser);
        hashPassword.mockResolvedValue("hashed");
        userModel.findByIdAndUpdate.mockResolvedValue(newUser);

        // Call the controller
        await updateProfileController(req, res);

        // Expect that functions are called with correct values 
        expect(hashPassword).toHaveBeenCalledWith("654321");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("test",
            newUser,
            { new: true }
        );

        // Expect that response status and message is correct
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: newUser,
        });
    })

    it('should fail to update if password is too short', async () => {
        // Mock old and new user data
        req.user._id = "test";
        req.body = { 
            password: "1",
        }

        const existingUser = {
            password: "66666666",
        }

        // Mock fn calls
        userModel.findById.mockResolvedValue(existingUser);

        // Call the controller to throw the error
        await updateProfileController(req, res);

        // Expect that response status and message is correct
        expect(res.json).toHaveBeenCalledWith({
            error: "Passsword is required and at least 6 character long",
          });
    })

    it('should update other fields only if password is not provided', async () => {
        // Mock old and new user data
        req.user._id = "test";
        req.body = { 
            name: "New",
            phone: "87654321",
            address: "New"
        }

        const existingUser = {
            name: "Old",
            password: "66666666",
            phone: "88888888",
            address: "Old"
        }

        const newUser = {
            name: "New",
            password: "66666666",  // Password unchanged
            phone: "87654321",
            address: "New"
        }

        // Mock fn calls
        userModel.findById.mockResolvedValue(existingUser);
        userModel.findByIdAndUpdate.mockResolvedValue(newUser);

        // Call the controller
        await updateProfileController(req, res);

        // Expect that functions are called with correct values 
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("test",
            newUser,
            { new: true }
        );

        // Expect that response status and message is correct
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: newUser,
        });
    })

    it('should handle errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock user data
        req.user._id = "test";

        // Mock error throw
        userModel.findById.mockRejectedValue(new Error("Error"));

        // Call the controller to throw the error
        await updateProfileController(req, res);

        // Expect that response status and message is correct
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Updating Profile",
            error: new Error("Error"),
        });
        expect(spy).toHaveBeenCalled();

        // Reset spy
        spy.mockRestore();
    })
});

describe('getOrdersController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { user: { _id: "Test"} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    });

    it('should successfully return a user\'s orders', async () => {
        // Mock order data
        const mockOrders = [
            { _id: "o1", buyer: { name: "Test" }, products: [
                { _id: "1", name: "Novel", price: 15.33, description: 'Novel' },
                { _id: "2", name: "Laptop", price: 1500.66, description: 'Laptop' }
            ]},
            { _id: "o2", buyer: { name: "Testing" }, products: [
                { _id: "1", name: "Novel", price: 15.33, description: 'Novel' }
            ]},
        ];

        // Mock return value and call the controller
        const findMock = {  // Handle the 2 populate call
            populate: jest.fn()
            .mockImplementationOnce(() => findMock) 
            .mockImplementationOnce(() => Promise.resolve(mockOrders)),
          };      
        orderModel.find.mockReturnValue(findMock);

        await getOrdersController(req, res);
    
        // Expect correct call values
        expect(orderModel.find).toHaveBeenCalledWith({ buyer: "Test" });
        expect(findMock.populate).toHaveBeenCalledWith("products", "-photo");
        expect(findMock.populate).toHaveBeenCalledWith("buyer", "name");
        expect(res.json).toHaveBeenCalledWith(mockOrders);

    })

    it('should handle errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Call the controller to trigger error as populate methods not mocked
        await getOrdersController(req, res);

        // Expect that response status and message is correct
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error: expect.any(Error),
        });
        expect(spy).toHaveBeenCalled();

        // Reset spy
        spy.mockRestore();
    })
});

describe('getAllOrdersControler', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    });

    it('should successfully return a user\'s orders', async () => {
        // Mock order data
        const mockOrders = [
            { _id: "o1", buyer: { name: "Test" }, products: [
                { _id: "1", name: "Novel", price: 15.33, description: 'Novel' },
                { _id: "2", name: "Laptop", price: 1500.66, description: 'Laptop' }
            ]},
            { _id: "o2", buyer: { name: "Testing" }, products: [
                { _id: "1", name: "Novel", price: 15.33, description: 'Novel' }
            ]},
        ];

        // Mock return value and call the controller
        const findMock = {  // Handle the 2 populate call and sort
            populate: jest.fn()
            .mockImplementationOnce(() => findMock) 
            .mockImplementationOnce(() => findMock),
            sort: jest.fn().mockResolvedValue(mockOrders),
          };      
        orderModel.find.mockReturnValue(findMock);

        await getAllOrdersController(req, res);
    
        // Expect correct call values
        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(findMock.populate).toHaveBeenCalledWith("products", "-photo");
        expect(findMock.populate).toHaveBeenCalledWith("buyer", "name");
        expect(findMock.sort).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockOrders);
    })

    it('should handle errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Call the controller to trigger error as find/populate methods not mocked
        await getAllOrdersController(req, res);

        // Expect that response status and message is correct
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error: expect.any(Error),
        });
        expect(spy).toHaveBeenCalled();

        // Reset spy
        spy.mockRestore();
    })
});

describe('orderStatusController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: { orderId: "1" },
            body: { status: "Not Processed" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    });

    it('should successfully update orders', async () => {
        // Mock updated order data
        req.body.status = "Processing";
        const updatedOrder = {
            _id: "1",
            status: "Processing",
            buyer: "Test",
        };


        // Mock functions
        orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

        await orderStatusController(req, res); 

        // Expect that response status and message is correct
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "1",
            { status: "Processing" },
            { new: true } 
        );
      
        // Verify response
        expect(res.json).toHaveBeenCalledWith(updatedOrder);
    })

    it('should handle errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock error throw
        orderModel.findByIdAndUpdate.mockRejectedValue(new Error("Error"));

        // Call the controller to throw error 
        await orderStatusController(req, res);

        // Expect that response status and message is correct
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Updating Order",
            error: new Error("Error"),
        });
        expect(spy).toHaveBeenCalled();

        // Reset spy
        spy.mockRestore();
    })
});
