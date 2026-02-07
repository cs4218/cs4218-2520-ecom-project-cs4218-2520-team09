import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
} from './authController.js';
import userModel from '../models/userModel.js';
import { hashPassword, comparePassword } from '../helpers/authHelper.js';
import JWT from 'jsonwebtoken';

// Mock dependencies
jest.mock('../models/userModel.js');
jest.mock('../models/orderModel.js');
jest.mock('../helpers/authHelper.js');
jest.mock('jsonwebtoken');

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
    expect(res.send).toHaveBeenCalledWith({ message: 'Emai is required' });
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
