import React from "react";
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import ProductDetails from "./ProductDetails";

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

// Mock data to use across tests
const mockProduct = { 
    _id: '1',
    name: 'Laptop',
    price: 1500,
    description: 'A laptop',
    slug: 'laptop',
    category: {_id: '1', name: 'Electronics'}
};

const mockSimilarProducts = [
    {   _id: '2', 
        name: 'Phone',
        price: 999.98,
        description: 'A phone',
        slug: 'phone',
        category: {_id: '1', name: 'Electronics'} 
    },
    {   _id: '3',
        name: 'Watch',
        price: 50,
        description: 'A watch',
        slug: 'watch',
        category: {_id: '1', name: 'Electronics'} 
    }
]

describe('ProductDetails', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    })

    it('should do nothing if no products found', () => {
        // Render the page
        render(
            <MemoryRouter initialEntries={['/product/']}>
                <Routes>
                    <Route path="/product" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect nothing to have happened
        return waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        })
    })

    it('should load product properly', async () => {
        // Mock axios call
        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: [] }});

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect correct details are present
        await waitFor(() => {
            expect(getByText("Product Details")).toBeInTheDocument();

            expect(getByText("Name: Laptop")).toBeInTheDocument();
            expect(getByText("Description: A laptop")).toBeInTheDocument();
            expect(getByText("Price: $1,500.00")).toBeInTheDocument();
            expect(getByText("Category: Electronics")).toBeInTheDocument();
        })
    })

    it('should load similar products if any', async () => {
        // Mock axios call
        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: mockSimilarProducts }});

        // Render the page
        const { getByText, getAllByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect correct details are present
        await waitFor(() => {
            expect(getByText("Similar Products ➡️")).toBeInTheDocument();

            expect(getByText("Phone")).toBeInTheDocument();
            expect(getByText("A phone")).toBeInTheDocument();
            expect(getByText("$999.98")).toBeInTheDocument();

            expect(getByText("Watch")).toBeInTheDocument();
            expect(getByText("A watch")).toBeInTheDocument();
            expect(getByText("$50.00")).toBeInTheDocument();

            expect(getAllByText("More Details")).toHaveLength(2);
        })
    })

    it('should handle when API call for similar product returns null', async () => {
        // Mock axios call
        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : null });

        // Render the page
        const { getByText } = await act(async () => render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        ));

        // Expect correct details are present
        await waitFor(() => {
            expect(getByText("Similar Products ➡️")).toBeInTheDocument();
            expect(getByText("No Similar Products Found")).toBeInTheDocument();
        })
    })

    it('should show no similar products if none', async () => {
        // Mock axios call
        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: [] }});

        // Render the page
        const { getByText } = await act(async () => render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        ));

        // Expect correct details are present
        await waitFor(() => {
            expect(getByText("Similar Products ➡️")).toBeInTheDocument();
            expect(getByText("No Similar Products Found")).toBeInTheDocument();
        })
    })

    it('should properly truncate long descriptions for similar products', async () => {
        // Mock several items with varying description length
        const newSimilarProducts = [
            {   _id: '2', 
                name: 'Phone',
                price: 999.98,
                description: 'Short',
                slug: 'phone',
                category: {_id:1, name: 'Electronics'} 
            },
            {   _id: '3',
                name: 'Watch',
                price: 50,
                description: 'A very long description that is more than 60 characters that should be truncated',
                slug: 'watch',
                category: {_id:1, name: 'Electronics'} 
            }
        ]

        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: newSimilarProducts }});

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect all values to be present
        await waitFor(() => {
            expect(getByText("Phone")).toBeInTheDocument();
            expect(getByText("Short")).toBeInTheDocument();
            
            expect(getByText("Watch")).toBeInTheDocument();
            expect(getByText("A very long description that is more than 60 characters that...")).toBeInTheDocument();
        })
    })

    it('should redirect to product details if More Details is clicked', async () => {
        // Mock axios call
        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: mockSimilarProducts }});

        // Render the page
        const { getAllByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        await waitFor(async () => {
            // Find the first More Details button and click it
            const addToCartButton = getAllByText('More Details')[0];
            fireEvent.click(addToCartButton);

            // Expect redirect to be called
            expect(mockedNavigate).toHaveBeenCalledWith("/product/phone");
        });
    })

    it('should add main product to cart properly', async () => {
        // Mock useCart
        const mockSetCart = jest.fn();
        require('../context/cart').useCart.mockReturnValue([[], mockSetCart]);

        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: [] }});

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        await waitFor(async () => {
            // Find the Add To Cart button for Main Product and click it
            const addToCartButton = getByText('Add To Cart');
            fireEvent.click(addToCartButton);

            // Expect new item to be present
            expect(mockSetCart).toHaveBeenCalledWith([mockProduct]);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'cart', JSON.stringify([mockProduct])
            );
        });
    })

    it('should add similar product to cart properly', async () => {
        // Mock useCart
        const mockSetCart = jest.fn();
        require('../context/cart').useCart.mockReturnValue([[], mockSetCart]);

        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: mockSimilarProducts }});

        // Render the page
        const { getAllByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        await waitFor(async () => {
            // Find the Add To Cart button for Similar Product and click it
            const addToCartButton = getAllByText('Add To Cart');
            fireEvent.click(addToCartButton[1]);

            // Expect new item to be present
            expect(mockSetCart).toHaveBeenCalledWith([mockSimilarProducts[0]]);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'cart', JSON.stringify([mockSimilarProducts[0]])
            );
        });
    })

    it('should catch getProduct errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock getProduct to fail
        axios.get.mockRejectedValueOnce(new Error('Product fetch error'));
    
        // Render the page
        render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect error to have been caught 
        await waitFor(() => expect(spy).toHaveBeenCalled());
    })

    it('should catch getSimilarProduct errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock getSimilarProduct to fail
        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockRejectedValueOnce(new Error('Product fetch error'));
    
        // Render the page
        render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect error to have been caught 
        await waitFor(() => expect(spy).toHaveBeenCalled());
    })
    
    // relatedProducts.length == 0 and 2 tested by above cases
    it('should show Similar Products if relatedProducts.length == 1', async () => {
         // Mock several items with varying description length
         const newSimilarProducts = [
            {   _id: '2', 
                name: 'Phone',
                price: 999.98,
                description: 'A phone',
                slug: 'phone',
                category: {_id:1, name: 'Electronics'} 
            }
        ]

        axios.get.mockResolvedValueOnce({data : { product: mockProduct }});
        axios.get.mockResolvedValueOnce({data : { products: newSimilarProducts }});

        // Render the page
        const { getByText, getAllByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect correct details are present
        await waitFor(() => {
            expect(getByText("Similar Products ➡️")).toBeInTheDocument();

            expect(getByText("Phone")).toBeInTheDocument();
            expect(getByText("A phone")).toBeInTheDocument();
            expect(getByText("$999.98")).toBeInTheDocument();

            expect(getAllByText("More Details")).toHaveLength(1);
        })
    })

    it('should handle products with missing fields', async () => {
        // Mock data with no id and null category
        const mockErrProduct = { 
            name: 'Laptop',
            price: 1500,
            description: 'A laptop',
            slug: 'laptop',
            category: null
        };

        // Mock axios call
        axios.get.mockResolvedValueOnce({data : { product: mockErrProduct }});
        axios.get.mockResolvedValueOnce({data : { products: mockSimilarProducts }});

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} /></Routes>
            </MemoryRouter>
        );

        // Expect item to still be displayed but no similar products
        await waitFor(() => {
            expect(getByText("Name: Laptop")).toBeInTheDocument();
            expect(getByText("Price: $1,500.00")).toBeInTheDocument();
            expect(getByText("Category:")).toBeInTheDocument();

            expect(getByText("No Similar Products Found")).toBeInTheDocument();
        })
    })
})