import React from "react";
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CartPage from "./CartPage";

// Written by
// Name: Chan Cheuk Hong John
// Student No: A0253435H

// Mocking dependenies
jest.mock("axios");
jest.mock('../hooks/useCategory.js')

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [[], jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));  

const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockedNavigate,
}));

// Mock braintree, with help from ChatGPT
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

Object.defineProperty(window, 'localStorage', {
    value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
    },
    writable: true,
});

describe('CartPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

    });

    afterEach(() => {
        jest.restoreAllMocks();
    })

    it('should display total price as 0 when cart is empty', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Render the cart page with empty cart
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Ensure that rendered page shows no items in cart
        return waitFor(() => {
            expect(getByText("Total : $0.00")).toBeInTheDocument();
            expect(getByText("Your Cart Is Empty")).toBeInTheDocument();
        });
    });

    it('should display total price correctly with several items in cart', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Setup mock data for the cart
        const mockCart = [
            { _id: "1", name: "Novel", price: 15.33, description: 'Novel' },
            { _id: "2", name: "Laptop", price: 1500.66, description: 'Laptop' },
        ];
        require('../context/cart').useCart.mockReturnValue([mockCart, jest.fn()]);

        // Render the cart page with 2 items in cart
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );
    
        // Ensure that Total : $1,515.99 appears in the rendered page
        return waitFor(() => {
            expect(getByText("Total : $1,515.99")).toBeInTheDocument();
        })
    });

    it('should display prompt and redirect user to log in if not already', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Render the cart page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );
    
        const button = screen.getByText("Please Login to Checkout");
        fireEvent.click(button);

        // Ensure that rendered page shows no items in cart
        return waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
        })
    });

    it('should remove item properly with only 1 item in cart', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Setup mock data for the cart
        const mockCart = [
            { _id: "1", name: "Novel", price: 15, description: 'Novel' },
        ];
        const mockSetCart = jest.fn();
        require('../context/cart').useCart.mockReturnValue([mockCart, mockSetCart]);

        // Render the cart page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Locate and click the Remove button
        const removeButton = getByText('Remove');
        fireEvent.click(removeButton);

        // Ensure that resulting page shows no items and Total is 0
        return waitFor(() => {
            expect(mockSetCart).toHaveBeenCalledWith([]);
            expect(localStorage.setItem).toHaveBeenCalledWith('cart', JSON.stringify([]));
        })
    });

    it('should function normally with duplicate items', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Setup mock data with duplicate items
        const mockCart = [
            { _id: "1", name: "Novel", price: 15, description: 'Novel' },
            { _id: "2", name: "Laptop", price: 1500, description: 'Laptop' },
            { _id: "2", name: "Laptop", price: 1500, description: 'Laptop' },
        ];

        const mockSetCart = jest.fn();        
        require('../context/cart').useCart.mockReturnValue([mockCart, mockSetCart]);
    
        // Setup updated mock data to reflect item removed
        const updatedCart = [
            { _id: "2", name: "Laptop", price: 1500, description: 'Laptop' },
            { _id: "2", name: "Laptop", price: 1500, description: 'Laptop' },
        ];

        // Remove item from cart
        const { getAllByText, rerender } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );
    
        const removeButtons = getAllByText('Remove');
        fireEvent.click(removeButtons[0]); 

        // Simulate updated cart and rerender the page
        require('../context/cart').useCart.mockReturnValue([updatedCart, mockSetCart]);
    
        rerender(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );
    
        return waitFor(() => {
            // Ensure that only 2 items remain 
            const productNames = getAllByText("Remove");
            expect(productNames).toHaveLength(2);
            
            // Ensure state was updated correctly
            expect(mockSetCart).toHaveBeenCalledWith(updatedCart);
        })
    });

    it('should properly redirect users when Update Address is pressed', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        // Setup mock user
        require('../context/auth').useAuth.mockReturnValue([
            {
                user: { name: 'Test', address: 'Test'},
                token: 'token'
            },
        jest.fn(),
        ]);

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Find and click the Update Address button
        const button = screen.getByText("Update Address");
        fireEvent.click(button);

        // Ensure that the redirect is done
        return waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
        })
    });

    it('should catch totalPrice errors', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Save original function
        const originalToLocaleString = Number.prototype.toLocaleString;

        // Mock toLocaleString to throw an error
        Number.prototype.toLocaleString = jest.fn(() => {
            throw new Error("toLocaleString failed");
        });

        // Render the page to forcibly throw the error
        render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Restore original function
        Number.prototype.toLocaleString = originalToLocaleString; 

        // Expect error to have been caught 
        return waitFor(() => {
            expect(spy).toHaveBeenCalled();
        })
    })

    it('should catch removeCartItem errors', () => {
        axios.get.mockResolvedValue({ data: { clientToken: "token" } });

        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock cart to throw error on removal of item
        const mockCart = [
            { _id: "1", name: "Novel", price: 15, description: 'Novel' }
        ];
        const mockSetCart = jest.fn(() => {
            throw new Error("setCart failed");
        });

        require('../context/cart').useCart.mockReturnValue([mockCart, mockSetCart]);

        // Render the page
        const { getByText } = render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Click on remove item to throw the error 
        const removeButton = getByText('Remove');
        fireEvent.click(removeButton);

        // Expect error to have been caught 
        return waitFor(() => {
            expect(spy).toHaveBeenCalled();
        })
    })

    it('should catch getToken errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock getToken to fail
        axios.get.mockRejectedValueOnce(new Error('Token fetch failed'));
    
        render(
            <MemoryRouter initialEntries={['/cart']}>
                <Routes>
                    <Route path="/cart" element={<CartPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Expect error to have been caught 
        await waitFor(() => expect(spy).toHaveBeenCalled());
    })

    // The following 2 test cases below were written with the help of ChatGPT
    // Specifically for mocking Braintree
    it('should run handlePayment without errors', async () => {
        // Setup mock user and cart data
        require('../context/auth').useAuth.mockReturnValue([
            {
                user: { name: 'Test', address: 'Test' },
                token: 'token'
            },
        jest.fn(),
        ]);
        axios.get.mockResolvedValue({ data: { clientToken: "Client Token" } });

        const mockCart = [
            { _id: "1", name: "Novel", price: 15, description: 'Novel' },
            { _id: "2", name: "Laptop", price: 1500, description: 'Laptop' },
        ];
        require("../context/cart").useCart.mockReturnValue([mockCart, jest.fn()]);

        // Mock payment API call
        axios.post.mockResolvedValue({ data: { success: true } });

        render(
            <MemoryRouter>
                <CartPage />
            </MemoryRouter>
        );
      
        // Wait until the button is rendered and enabled
        const payButton = await waitFor(() => 
            screen.getByRole("button", { name: "Make Payment" })
          );
        await waitFor(() => { if (payButton.disabled) throw new Error("wait"); });
        fireEvent.click(payButton);
      
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/product/braintree/payment",
                expect.objectContaining({
                    nonce: "nonce",
                    cart: expect.any(Array),
                })
            );
        });
    });

    it('should catch handlePayment errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Setup mock user and cart data
        require('../context/auth').useAuth.mockReturnValue([
            {
                user: { name: 'Test', address: 'Test' },
                token: 'token'
            },
        jest.fn(),
        ]);

        const mockCart = [
            { _id: "1", name: "Novel", price: 15, description: 'Novel' },
            { _id: "2", name: "Laptop", price: 1500, description: 'Laptop' },
        ];
        require("../context/cart").useCart.mockReturnValue([mockCart, jest.fn()]);

        // Mock getToken to succeed
        axios.get.mockResolvedValue({ data: { clientToken: "Client Token" } });

        // Mock handlePayment to fail
        axios.post.mockRejectedValueOnce(new Error('Payment failed'));        
    
        render(
            <MemoryRouter>
                <CartPage />
            </MemoryRouter>
        );
        
        // Wait until the button is rendered and enabled
        const payButton = await screen.findByRole("button", { name: "Make Payment" });
        await waitFor(() => { if (payButton.disabled) throw new Error("wait"); });
        fireEvent.click(payButton);

        // Expect error to have been caught 
        await waitFor(() => expect(spy).toHaveBeenCalled());
    })
})


