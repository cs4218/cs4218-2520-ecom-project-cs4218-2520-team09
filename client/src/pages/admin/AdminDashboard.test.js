// Tan Wei Zhi, A0253519B

import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "../../pages/admin/AdminDashboard";

jest.mock("../../context/auth", () => ({
    useAuth: jest.fn()
}));

jest.mock("../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => ({ children }) => (
    <div data-testid="admin-menu">Admin Menu</div>
));

import { useAuth } from "../../context/auth";

describe("AdminDashboard", () => {
    beforeEach(()=> {
        useAuth.mockReturnValue([
            {
                user: {
                    name: "Fake Admin",
                    email: "fakeadmin@test.com",
                    phone: "1234567890"
                },
                token: "random-token"
            },
            jest.fn(),
        ]);
    })

    test("Renders details correctly", () => {
        render(<AdminDashboard />);

        expect(screen.getByTestId("layout")).toBeInTheDocument();
        expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

        expect(screen.getByText("Admin Name : Fake Admin")).toBeInTheDocument();
        expect(
            screen.getByText("Admin Email : fakeadmin@test.com")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Admin Contact : 1234567890")
        ).toBeInTheDocument();
    })

});