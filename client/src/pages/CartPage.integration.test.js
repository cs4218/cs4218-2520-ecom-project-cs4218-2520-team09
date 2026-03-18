import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import CartPage from './CartPage';
import ProductDetails from './ProductDetails';
import { AuthProvider } from '../context/auth';
import { CartProvider } from '../context/cart';
import { SearchProvider } from '../context/search';

// Written by
// Name: Chan Cheuk Hong John
// Student No: A0253435H

// Mock only external dependencies
jest.mock('axios');
jest.mock('../hooks/useCategory.js')

// Mock braintree
jest.mock("braintree-web-drop-in-react", () => {
    const React = require("react");
    return {
      __esModule: true,
      default: ({ onInstance }) => {
        React.useEffect(() => {
          const fakeInstance = {
            requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "nonce" }),
          };
          onInstance(fakeInstance);
        }, []);
        return <div>Mocked DropIn</div>;
        },
    };  
});

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

describe('CartPage Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('should display total price as 0 when cart is empty', async () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Load CartPage
        const { getByText: getByTextCart } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider> 
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getByTextCart('Your Cart Is Empty')).toBeInTheDocument();
            expect(getByTextCart('Total : $0.00')).toBeInTheDocument();
        });
    });

    it('should not allow payment if user is not logged in', async () => {
        // Load CartPage
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider> 
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getByText('Please Login to Checkout')).toBeInTheDocument();
        });
    });

    it('should add item(s) successfully', async () => {
        // Add setup item to add to cart
        const mockProduct = {
            _id: '1',
            name: 'Laptop',
            price: 1500,
            description: 'A great laptop',
            slug: 'laptop',
            category: { _id: 'c', name: 'Electronics' }
        };

        axios.get.mockResolvedValue({ data: { product: mockProduct, products: [] } });
        const { getByText: getByTextProduct, unmount } = render(
            <MemoryRouter initialEntries={['/product/laptop']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Routes>
                                <Route path="/product/:slug" element={<ProductDetails />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => expect(getByTextProduct('Name: Laptop')).toBeInTheDocument());

        // Click Add To Cart
        const addButton = await waitFor(() => {
            const buttons = document.querySelectorAll('button');
            return Array.from(buttons).find(btn => btn.textContent.includes('Add To Cart'));
        });
        fireEvent.click(addButton);

        // Ensure that item is added to localstorage
        await waitFor(() => {
            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(1);
            expect(cart[0].name).toBe('Laptop');
        });

        unmount();

        // Load CartPage
        const { getByText: getByTextCart } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider> 
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Ensure that the item properly added
        await waitFor(() => {
            expect(getByTextCart('Laptop')).toBeInTheDocument();
            expect(getByTextCart('Total : $1,500.00')).toBeInTheDocument();
        });
    });

    it('should remove item(s) successfully', async () => {
        // Setup items in cart
        const initialCart = [
            { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop' },
            { _id: '2', name: 'Phone', price: 999, description: 'A phone' }
        ];
        localStorage.setItem('cart', JSON.stringify(initialCart));

        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Render CartPage
        const { getByText, getAllByText, queryByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Remove the first item 
        const removeButtons = getAllByText('Remove');
        fireEvent.click(removeButtons[0]);

        await waitFor(() => {
            expect(queryByText('Laptop')).not.toBeInTheDocument();
            expect(getByText('Phone')).toBeInTheDocument();
        });

        // Ensure that localStorage is updated
        const updatedCart = JSON.parse(localStorage.getItem('cart'));
        expect(updatedCart).toHaveLength(1);
        expect(updatedCart[0].name).toBe('Phone');
    });

    it('should only allow logged in user to make payment', async () => {
        // Setup user and cart
        const authData = {
            user: { name: 'Test', email: 'test@test.com', address: 'Testing Street' },
            token: 'token'
        };
        localStorage.setItem('auth', JSON.stringify(authData));

        const cartItems = [
            { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop' }
        ];
        localStorage.setItem('cart', JSON.stringify(cartItems));

        axios.post.mockResolvedValue({ data: { success: true } });

        // Render CartPage
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for payment button to be enabled
        const payButton = await waitFor(() => 
            screen.getByRole("button", { name: "Make Payment" })
        );

        // Make payment
        fireEvent.click(payButton);

        // Ensure that Payment API is called
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/product/braintree/payment",
                expect.objectContaining({
                    nonce: "nonce",
                    cart: expect.arrayContaining([
                        expect.objectContaining({ name: 'Laptop' })
                    ])
                })
            );
        });

        // Ensure that localstorage is cleared
        expect(localStorage.getItem('cart')).toBeNull();

    });

    it('should catch payment errors', async () => {
        const spy = jest.spyOn(console, "log").mockImplementation(() => {});

        // Setup user and cart
        const authData = {
            user: { name: 'Test', email: 'test@test.com', address: 'Testing Street' },
            token: 'token'
        };
        localStorage.setItem('auth', JSON.stringify(authData));

        const cartItems = [
            { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop' }
        ];
        localStorage.setItem('cart', JSON.stringify(cartItems));

        axios.post.mockRejectedValueOnce(new Error('Payment failed'));        
        
        // Render CartPage
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for payment button to be enabled
        const payButton = await waitFor(() => 
            screen.getByRole("button", { name: "Make Payment" })
        );

        // Make payment
        fireEvent.click(payButton);

        await waitFor(() => {
            expect(spy).toHaveBeenCalledWith(expect.any(Error));
        })

        spy.mockRestore()
    });
})