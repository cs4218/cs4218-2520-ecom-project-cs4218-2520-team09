import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import CartPage from './CartPage';
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
    });

    afterEach(() => {
        localStorage.clear();
    })

    it('should display total price as 0 when cart is empty', async () => {
        axios.get.mockResolvedValueOnce({ data: { clientToken: "token" } });

        // Load CartPage
        const { getByText    } = render(
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
            expect(getByText('Your Cart Is Empty')).toBeInTheDocument();
            expect(getByText('Total : $0.00')).toBeInTheDocument();
        });
    });

    it('should not allow payment if user is not logged in', async () => {
        axios.get.mockResolvedValueOnce({ data: { clientToken: "token" } });

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

    it('should display total price of multiple item successfully', async () => {
        // Setup items in cart
        const initialCart = [
            { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop' },
            { _id: '2', name: 'Phone', price: 999, description: 'A phone' }
        ];
        localStorage.setItem('cart', JSON.stringify(initialCart));

        axios.get.mockResolvedValueOnce({ data: { clientToken: "token" } });

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

        // Ensure that total price is accurate
        await waitFor(() => {
            expect(getByText('Total : $2,499.00')).toBeInTheDocument();
        })
    });

    it('should remove item successfully', async () => {
        // Setup items in cart
        const initialCart = [
            { _id: '1', name: 'Laptop', price: 1500, description: 'A laptop' },
            { _id: '2', name: 'Phone', price: 999, description: 'A phone' }
        ];
        localStorage.setItem('cart', JSON.stringify(initialCart));

        axios.get.mockResolvedValueOnce({ data: { clientToken: "token" } });

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

        axios.get.mockResolvedValue({ data: { clientToken: "token" } });
        axios.post.mockResolvedValue({ data: { success: true } });

        // Render CartPage
        render(
            <MemoryRouter initialEntries={['/cart']}>
                <AuthProvider>
                        <SearchProvider>
                        <CartProvider>
                            <Routes>
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/dashboard/user/orders" element={<div>Orders Page</div>} />
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

        console.log('localStorage:', localStorage.getItem('cart'));

        expect(payButton).not.toBeDisabled();

        // Make payment
        await act(async () => {
            fireEvent.click(payButton);
        })

        console.log('axios calls:', axios.post.mock.calls);

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

        axios.get.mockResolvedValueOnce({ data: { clientToken: "token" } });
        axios.post.mockRejectedValue(new Error('Payment failed'));        
        
        // Render CartPage
        render(
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