import React from 'react';
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

// Written by
// Name: Chan Cheuk Hong John
// Student No: A0253435H

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe("Cart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should initialize as empty when localStorage is null", () => {
        // Render the useCart hook
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        const cart = result.current[0];

        // Ensure that cart remains empty
        expect(cart).toEqual([]);
    });

    it("should load cart when localStorage is not null", () => {
        // Setup mock data for localStorage
        const mockCart = [
        { _id: "1", name: "Novel", price: 15 },
        { _id: "2", name: "Laptop", price: 1500 },
        ];

        localStorage.getItem.mockReturnValue(JSON.stringify(mockCart));

        // Render the useCart hook
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        const [cart] = result.current;

        // Ensure that cart remains unchanged from localStorage
        expect(cart).toEqual(mockCart);
    });

    it("should handle when localStorage is corrupt", () => {
        // Mock localStorage to return weird values
        localStorage.getItem.mockReturnValue("test-nonjson");

        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Render the useCart hook
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        const [cart] = result.current;

        // Ensure that cart is empty, does not load from corrupt value
        expect(cart).toEqual([]);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
  });

    it("should update cart state when setCart is called", () => {
        // Setup mock data for localStorage
        const mockCart = [
            { _id: "1", name: "Novel", price: 15 },
            { _id: "2", name: "Laptop", price: 1500 },
        ];
        const newItem = { _id: "3", name: "Keyboard", price: 120 };
    
        localStorage.getItem.mockReturnValue(JSON.stringify(mockCart));

        // Render the useCart hook
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });

        // Update the cart by adding a new item
        const [currentCart, setCart] = result.current;
        act(() => {
        setCart([...currentCart, newItem]);
        });
        const [updatedCart] = result.current;

        // Ensure that updated cart consists of old and new items
        expect(updatedCart).toEqual([...mockCart, newItem]);
    });
});
