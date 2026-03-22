// Tan Wei Zhi, A0253519B
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import AdminDashboard from "../../pages/admin/AdminDashboard";

// Mock only the external dependency (auth state source) so the test is
// deterministic and does not depend on LocalStorage or a real auth server.
jest.mock("../../context/auth", () => ({
    __esModule: true,
    useAuth: jest.fn(),
}));

// Mock Layout to avoid pulling in Header / Footer / Helmet side-effects that
// are outside the scope of this integration.
jest.mock("../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

import { useAuth } from "../../context/auth";

const MOCK_ADMIN = {
    name: "Test Admin",
    email: "admin@test.com",
    phone: "98765432",
};

const renderWithRouter = () =>
    render(
        <MemoryRouter>
            <AdminDashboard />
        </MemoryRouter>
    );


describe("Bottom-Up Integration: AdminDashboard + AdminMenu + AuthContext", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue([{ user: MOCK_ADMIN, token: "fake-token" }, jest.fn()]);
    });

    test("renders admin name, email, and phone from auth context", () => {
        renderWithRouter();

        expect(screen.getByText("Admin Name : Test Admin")).toBeInTheDocument();
        expect(screen.getByText("Admin Email : admin@test.com")).toBeInTheDocument();
        expect(screen.getByText("Admin Contact : 98765432")).toBeInTheDocument();
    });

    test("real AdminMenu renders Admin Panel heading in integrated view", () => {
        renderWithRouter();

        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    test("real AdminMenu renders Create Category navigation link with correct href", () => {
        renderWithRouter();

        const link = screen.getByRole("link", { name: "Create Category" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/create-category");
    });

    test("real AdminMenu renders Create Product navigation link with correct href", () => {
        renderWithRouter();

        const link = screen.getByRole("link", { name: "Create Product" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/create-product");
    });

    test("real AdminMenu renders Products navigation link with correct href", () => {
        renderWithRouter();

        const link = screen.getByRole("link", { name: "Products" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/products");
    });

    test("real AdminMenu renders Orders navigation link with correct href", () => {
        renderWithRouter();

        const link = screen.getByRole("link", { name: "Orders" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/orders");
    });

    test("renders gracefully when auth user fields are undefined", () => {
        useAuth.mockReturnValue([{ user: {}, token: "fake-token" }, jest.fn()]);
        renderWithRouter();

        // Labels should still render even with no user data values
        expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
        expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
        expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
    });
});
