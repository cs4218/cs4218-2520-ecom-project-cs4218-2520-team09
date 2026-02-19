// Liu, Yiwei, A0332922J
import { jest } from '@jest/globals';
import {
    createCategoryController,
    updateCategoryController,
    categoryControlller,
    singleCategoryController,
    deleteCategoryCOntroller,
}
    from './categoryController';
import categoryModel from '../models/categoryModel.js';

jest.mock('../models/categoryModel.js');

describe('Category Controllers Test Suite', () => {
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
    });

    describe('createCategoryController', () => {
        // Liu, Yiwei, A0332922J
        test('Should return 401 if name is missing', async () => {
            req.body.name = '';

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ message: 'Name is required' });
        });
        // Liu, Yiwei, A0332922J
        test('Should return 200 if category already exists', async () => {
            req.body.name = 'Electronics';
            categoryModel.findOne.mockResolvedValue({ name: 'Electronics' });

            await createCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: 'Electronics' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Category Already Exisits',
            });
        });
        // Liu, Yiwei, A0332922J
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
        // Liu, Yiwei, A0332922J
        test('Should return 500 on error', async () => {
            req.body.name = 'Error Case';
            const error = new Error('Database Error');
            categoryModel.findOne.mockRejectedValue(error);

            await createCategoryController(req, res);

            expect(console.log).toBeDefined();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Errro in Category',
            }));
        });
    });

    describe('updateCategoryController', () => {
        // Liu, Yiwei, A0332922J
        test('Should update category successfully', async () => {
            req.body.name = 'Updated Name';
            req.params.id = '123';
            const mockUpdatedCategory = { _id: '123', name: 'Updated Name', slug: 'updated-name' };
            categoryModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedCategory);

            await updateCategoryController(req, res);

            expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                '123',
                { name: 'Updated Name', slug: 'Updated Name' },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                messsage: 'Category Updated Successfully',
                category: mockUpdatedCategory,
            });
        });
        // Liu, Yiwei, A0332922J
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

    describe('categoryControlller', () => {
        // Liu, Yiwei, A0332922J
        test('Should get all categories successfully', async () => {
            const mockList = [{ name: 'C1' }, { name: 'C2' }];
            categoryModel.find.mockResolvedValue(mockList);

            await categoryControlller(req, res);

            expect(categoryModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'All Categories List',
                category: mockList,
            });
        });
        // Liu, Yiwei, A0332922J
        test('Should return 500 on get all error', async () => {
            categoryModel.find.mockRejectedValue(new Error('Fetch failed'));

            await categoryControlller(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Error while getting all categories',
            }));
        });
    });

    describe('singleCategoryController', () => {
        // Liu, Yiwei, A0332922J
        test('Should get single category successfully', async () => {
            req.params.slug = 'test-slug';
            const mockCategory = { name: 'Test', slug: 'test-slug' };
            categoryModel.findOne.mockResolvedValue(mockCategory);

            await singleCategoryController(req, res);

            expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'test-slug' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Get SIngle Category SUccessfully', category: mockCategory,
            });
        });
        // Liu, Yiwei, A0332922J
        test('Should return 500 on get single error', async () => {
            req.params.slug = 'error-slug';
            categoryModel.findOne.mockRejectedValue(new Error('Find failed'));

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Error While getting Single Category',
            }));
        });
    });

    describe('deleteCategoryCOntroller', () => {
        // Liu, Yiwei, A0332922J
        test('Should delete category successfully', async () => {
            req.params.id = '123';
            categoryModel.findByIdAndDelete.mockResolvedValue({});

            await deleteCategoryCOntroller(req, res);

            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith('123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Categry Deleted Successfully',
            });
        });

        test('Should return 500 on delete error', async () => {
            // Liu, Yiwei, A0332922J
            req.params.id = '123';
            categoryModel.findByIdAndDelete.mockRejectedValue(new Error('Delete failed'));

            await deleteCategoryCOntroller(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                message: 'error while deleting category',
            }));
        });
    });
});