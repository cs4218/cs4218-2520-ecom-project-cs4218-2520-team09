import React from "react";
import { render, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CategoryProduct from "./CategoryProduct";

// Mock dependencies
jest.mock("axios");
jest.mock('../hooks/useCategory.js')

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [[], jest.fn()])
}));

jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockedNavigate,
}));

Object.defineProperty(window, 'matchMedia', {
    writable: true, 
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
    })),
});

Object.defineProperty(window, 'localStorage', {
    value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
    },
    writable: true,
});

describe('CategoryProduct', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    })

    it('should do nothing if no products found', () => {
        // Render the page
        render(
            <MemoryRouter initialEntries={['/category/']}>
                <Routes>
                    <Route path="/category/" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect nothing to have happened
        return waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        })
    })

    it('should fetch category with items properly', () => {
        // Mock several items to return
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [
                    { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop', slug: 'laptop' },
                    { _id: '2', name: 'Phone', price: 999.98, description: 'A phone', slug: 'phone' },
                    { _id: '3', name: 'Watch', price: 50, description: 'A watch', slug: 'watch' }
                ]
            }
        })

        // Render the page
        const { getByText, getAllByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect all values to be present
        return waitFor(() => {
            expect(getByText("Category - Electronics")).toBeInTheDocument();
            expect(getByText("3 result(s) found")).toBeInTheDocument();
            
            expect(getByText("Laptop")).toBeInTheDocument();
            expect(getByText("$1,500.00")).toBeInTheDocument();
            expect(getByText("A laptop")).toBeInTheDocument();

            expect(getByText("Phone")).toBeInTheDocument();
            expect(getByText("$999.98")).toBeInTheDocument();
            expect(getByText("A phone")).toBeInTheDocument();

            expect(getByText("Watch")).toBeInTheDocument();
            expect(getByText("$50.00")).toBeInTheDocument();
            expect(getByText("A watch")).toBeInTheDocument();

            expect(getAllByText("More Details")).toHaveLength(3);
        })
    })

    it('should fetch category with no items properly', () => {
        // Mock no items to return
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: []
            }
        })

        // Render the page
        const { getByText, queryAllByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect all values to be present
        return waitFor(() => {
            expect(getByText("Category - Electronics")).toBeInTheDocument();
            expect(getByText("0 result(s) found")).toBeInTheDocument();
        
            expect(queryAllByText("More Details")).toHaveLength(0);
        })
    })

    it('should properly truncate long descriptions', () => {
        // Mock several items to return
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [
                    { _id: '1', name: 'Laptop', price: 1500, description: 'Short', slug: 'laptop' },
                    { _id: '2', name: 'Phone', price: 999.98, description: 'A very long description that is more than 60 characters that should be truncated', slug: 'phone' },
                ]
            }
        })

        // Render the page
        const { getByText, queryAllByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect all values to be present
        return waitFor(() => {
            expect(getByText("Laptop")).toBeInTheDocument();
            expect(getByText("Short")).toBeInTheDocument();
            
            expect(getByText("Phone")).toBeInTheDocument();
            expect(getByText("A very long description that is more than 60 characters that...")).toBeInTheDocument();
        })
    })

    it('should redirect to product details if More Details is clicked', () => {
        // Mock several items to return
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [
                    { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop', slug: 'laptop' },
                ]
            }
        })

        // Render the page
        const { getByText, queryAllByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        return waitFor(async () => {
            // Find the More Details button and click it
            const addToCartButton = getByText('More Details');
            fireEvent.click(addToCartButton);

            // Expect redirect to be called
            expect(mockedNavigate).toHaveBeenCalledWith("/product/laptop");
        });
    })

    it('should add items to cart properly', () => {
        // Mock useCart
        const mockSetCart = jest.fn();
        require('../context/cart').useCart.mockReturnValue([[], mockSetCart]);

        // Mock item to add to cart
        const mockProduct = { 
            _id: '1', 
            name: 'Laptop', 
            price: 1500, 
            description: 'A laptop', 
            slug: 'laptop' 
        };
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [mockProduct]
            }
        });

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        return waitFor(async () => {
            // Find the Add To Cart button and click it
            const addToCartButton = getByText('Add To Cart');
            fireEvent.click(addToCartButton);

            // Expect new item to be present
            await waitFor(() => {
                expect(mockSetCart).toHaveBeenCalledWith([mockProduct]);
                expect(localStorage.setItem).toHaveBeenCalledWith(
                    'cart', JSON.stringify([mockProduct])
                );
            });
        });
    })

    it('should load more items properly', () => {
        // Mock several items to return
        // Set total = 3 but only 2 products here to trigger the loadmore button 
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [
                    { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop', slug: 'laptop' },
                    { _id: '2', name: 'Phone', price: 999.98, description: 'A phone', slug: 'phone' },
                ],
                total: 3
            }
        })

        // Extra items to load on second page
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [
                    { _id: '3', name: 'Watch', price: 50, description: 'A watch', slug: 'watch' }
                ],
                total: 3
            }
        })

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect new item to be present after clicking Load more
        return waitFor(async () => {
            const loadMoreButton = getByText('Load more');
            fireEvent.click(loadMoreButton);

            // Expect new item to be present
            await waitFor(() => {
                expect(getByText("3 result(s) found")).toBeInTheDocument();
                expect(getByText("Watch")).toBeInTheDocument();
                expect(getByText("$50.00")).toBeInTheDocument();
                expect(getByText("A watch")).toBeInTheDocument();
            });
        });
    })

    it('should handle products with missing fields', () => {
        // Mock error data
        axios.get.mockResolvedValueOnce({
            data: {}
        })

        // Render the page
        const { getByText, getAllByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect no errors, nothing returned
        return waitFor(() => {
            expect(getByText("0 result(s) found")).toBeInTheDocument();
        })
    })

    it('should catch loadMore errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock data to enable the Load More button, then trigger the error
        axios.get.mockResolvedValueOnce({
            data: {
                category: { name: 'Electronics' },
                products: [
                    { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop', slug: 'laptop' },
                    { _id: '2', name: 'Phone', price: 999.98, description: 'A phone', slug: 'phone' },
                ],
                total: 3
            }
        })
        
        axios.get.mockRejectedValueOnce(new Error('Product fetch error'));

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );


        return waitFor(async () => {
            // Trigger the error
            const loadMoreButton = getByText('Load more');
            fireEvent.click(loadMoreButton);

            // Expect error to have been caught 
            await waitFor(() => expect(spy).toHaveBeenCalled());    
        });
    })

    it('should catch getProductsByCat errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock getProductsByCat to fail
        axios.get.mockRejectedValueOnce(new Error('Product fetch error'));
    
        // Render the page
        render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect error to have been caught 
        await waitFor(() => expect(spy).toHaveBeenCalled());
    })
})