// Liu, Yiwei, A0332922J
import { jest } from '@jest/globals';
import {
    createCategoryController,
    updateCategoryController,
    categoryController,
    singleCategoryController,
    deleteCategoryController,
} from './categoryController';
import categoryModel from '../models/categoryModel.js';

jest.mock('../models/categoryModel.js');

// Liu, Yiwei, A0332922J
describe('Admin Actions: Category Controllers Test Suite', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterAll(() => {
        console.log.mockRestore();
    });

    // Liu, Yiwei, A0332922J
    describe('createCategoryController', () => {
        test('Should return 401 if name is missing', async () => {
            req.body.name = '';

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ message: 'Name is required' });
        });

        test('Should return 200 if category already exists', async () => {
            req.body.name = 'Electronics';
            categoryModel.findOne.mockResolvedValue({ name: 'Electronics' });

            await createCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: 'Electronics' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Category Already Exists',
            });
        });

        test('Should return 201 and create category successfully', async () => {
            req.body.name = 'New Category';
            categoryModel.findOne.mockResolvedValue(null);
            const mockSave = jest.fn().mockResolvedValue({ name: 'New Category', slug: 'new-category' });
            categoryModel.mockImplementation(() => ({
                save: mockSave
            }));

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'new category created',
            }));
        });

        test('Should handle error and return 500 status', async () => {
            req.body.name = 'Error Case';
            const error = new Error('Database Error');
            categoryModel.findOne.mockRejectedValue(error);

            await createCategoryController(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error in Category',
                error: error
            }));
        });
    });

    // Liu, Yiwei, A0332922J
    describe('updateCategoryController', () => {
        test('Should update category successfully', async () => {
            req.body.name = 'Updated Name';
            req.params.id = '123';
            const mockUpdatedCategory = { _id: '123', name: 'Updated Name', slug: 'updated-name' };
            categoryModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedCategory);

            await updateCategoryController(req, res);

            expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                '123',
                { name: 'Updated Name', slug: expect.any(String) }, 
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Category Updated Successfully',
                category: mockUpdatedCategory,
            });
        });

        test('Should return 500 on update error', async () => {
            req.body.name = 'Fail';
            req.params.id = '123';
            categoryModel.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error while updating category',
            }));
        });
    });

    // Liu, Yiwei, A0332922J
    describe('categoryController', () => {
        test('Should fetch all categories successfully', async () => {
            const mockCategories = [{ name: 'Category 1' }, { name: 'Category 2' }];
            categoryModel.find.mockResolvedValue(mockCategories);

            await categoryController(req, res);

            expect(categoryModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'All Categories List',
                category: mockCategories,
            });
        });

        test('Should return 500 on fetch all error', async () => {
            categoryModel.find.mockRejectedValue(new Error('Fetch all failed'));

            await categoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error while getting all categories',
            }));
        });
    });

    // Liu, Yiwei, A0332922J
    describe('singleCategoryController', () => {
        test('Should fetch a single category successfully', async () => {
            req.params.slug = 'test-category';
            const mockCategory = { name: 'Test Category', slug: 'test-category' };
            categoryModel.findOne.mockResolvedValue(mockCategory);

            await singleCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'test-category' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Get Single Category Successfully',
                category: mockCategory,
            });
        });

        test('Should return 500 on fetch single error', async () => {
            req.params.slug = 'test-category';
            categoryModel.findOne.mockRejectedValue(new Error('Fetch single failed'));

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error while getting single category',
            }));
        });
    });

    // Liu, Yiwei, A0332922J
    describe('deleteCategoryController', () => {
        test('Should delete category successfully', async () => {
            req.params.id = '123';
            categoryModel.findByIdAndDelete.mockResolvedValue({});

            await deleteCategoryController(req, res);

            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith('123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Category Deleted Successfully',
            });
        });

        test('Should return 500 on delete error', async () => {
            req.params.id = '123';
            categoryModel.findByIdAndDelete.mockRejectedValue(new Error('Delete failed'));

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                message: 'error while deleting category',
            }));
        });
    });
});