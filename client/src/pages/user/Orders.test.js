import React from "react";
import { render, within, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Orders from "./Orders";

// Written by
// Name: Chan Cheuk Hong John
// Student No: A0253435H

// Mocking dependenies
jest.mock("axios");
jest.mock("../../hooks/useCategory")
jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [ { user: { name: "Test" }, token: "token" }, jest.fn() ])    // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [[], jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));  

describe('CartPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should properly call getOrders on page load', () => {
        // Mock axios to return something
        axios.get.mockResolvedValueOnce({ data: [] });

        // Render the page
        render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // Expect the API call to be made
        return waitFor(() => 
            {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/orders')
            });
    })

    it('should show no orders if there are none', () => {
        // Mock axios to return something
        axios.get.mockResolvedValueOnce({ data: [] });

        // Render the page
        render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // Expect that no <th ...> tags are loaded if no orders found
        return waitFor(() => {
            const headers = screen.queryAllByRole("columnheader");
            expect(headers).toHaveLength(0); 
        });
    })

    it('should show orders if there are any', async () => {
        // Mock orders data
        const mockOrders = [
            {
                _id: "1",
                status: "Not Processed",
                buyer: { name: "John Doe" },
                createAt: "2024-01-01",
                payment: { success: true },
                products: [
                    { _id: "p1", name: "Novel", description: "Novel", price: 15 }
                ]
            },
            {
                _id: "2",
                status: "Processing",
                buyer: { name: "Jane No" },
                createAt: "2026-01-01",
                payment: { success: false },
                products: [
                    { _id: "p2", name: "Laptop", description: "Laptop", price: 1500 },
                    { _id: "p3", name: "Phone", description: "Phone", price: 9999.99 }
                ]
            }
        ];

        // Mock axios to return mocked order data
        axios.get.mockResolvedValue({ data: mockOrders });

        // Render the page
        render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // Expect that orders are displayed
        return waitFor(() => {
            const headers = screen.queryAllByRole("columnheader");
            expect(headers.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText("Not Processed")).toBeInTheDocument();
            expect(screen.getByText("Jane No")).toBeInTheDocument();
            expect(screen.getByText("Success")).toBeInTheDocument();
            expect(screen.getByText("Failed")).toBeInTheDocument();

            // Checking that quantity is correct by extracting specific row and checking last cell
            const row1 = within(screen.getByText("John Doe").closest("tr")).getAllByRole('cell');
            expect(row1[row1.length - 1]).toHaveTextContent("1")

            const row2 = within(screen.getByText("Jane No").closest("tr")).getAllByRole('cell');
            expect(row2[row2.length - 1]).toHaveTextContent("2")

            // Check that both name and description is in
            expect(screen.getAllByText("Novel").length).toBeGreaterThanOrEqual(2);
            expect(screen.getAllByText("Phone").length).toBeGreaterThanOrEqual(2);
        });
    })

    it('should catch Orders errors', async () => {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        // Mock axios to return error
        axios.get.mockRejectedValueOnce(new Error('Failed to fetch orders'));

        // Render the page to forcibly throw the error
        render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // Expect error to have been caught 
        await waitFor(() => expect(spy).toHaveBeenCalled());
    })

    it('does not call getOrders if logged in but no user token', async () => {
        // Mock axios to return something
        axios.get.mockResolvedValueOnce({ data: [] });

        // Forcibly remove token from user
        require('../../context/auth').useAuth.mockReturnValue([
            {
                user: { name: 'Test', address: 'Test' },
            },
            jest.fn(),
        ]);

        // Render the page
        render(
          <MemoryRouter>
            <Orders />
          </MemoryRouter>
        );
      
        await waitFor(() => {
          expect(axios.get).not.toHaveBeenCalled();
        });
    });
})