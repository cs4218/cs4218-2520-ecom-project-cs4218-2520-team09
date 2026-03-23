// Tan Wei Zhi, A0253519B
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Profile from "../../pages/user/Profile";

// Mock only external dependencies — UserMenu is intentionally left real.
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
    __esModule: true,
    default: { success: jest.fn(), error: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
}));

// Mock Layout to avoid Header / Footer / Helmet side-effects.
jest.mock("../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Mock useAuth at the auth context boundary; this lets us provide stable user
// data without depending on a real server or LocalStorage race conditions.
const mockSetAuth = jest.fn();
jest.mock("../../context/auth", () => ({
    __esModule: true,
    useAuth: jest.fn(),
}));

import { useAuth } from "../../context/auth";

const MOCK_USER = {
    name: "Jane Doe",
    email: "jane@test.com",
    phone: "91234567",
    address: "456 Test Ave",
};

const renderWithRouter = () =>
    render(
        <MemoryRouter>
            <Profile />
        </MemoryRouter>
    );

describe("Bottom-Up Integration: Profile + UserMenu + AuthContext", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {});

        useAuth.mockReturnValue([{ user: MOCK_USER, token: "test-token" }, mockSetAuth]);

        localStorage.setItem("auth", JSON.stringify({ user: MOCK_USER, token: "test-token" }));
    });

    afterEach(() => {
        console.log.mockRestore();
        localStorage.clear();
    });

    test("form fields are pre-populated with user data from auth context", async () => {
        await act(async () => {
            renderWithRouter();
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
            expect(screen.getByDisplayValue("jane@test.com")).toBeInTheDocument();
            expect(screen.getByDisplayValue("91234567")).toBeInTheDocument();
            expect(screen.getByDisplayValue("456 Test Ave")).toBeInTheDocument();
        });
    });

    test("real UserMenu renders Dashboard heading in integrated view", async () => {
        await act(async () => {
            renderWithRouter();
        });

        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    test("real UserMenu renders Profile navigation link with correct href", async () => {
        await act(async () => {
            renderWithRouter();
        });

        const link = screen.getByRole("link", { name: "Profile" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/user/profile");
    });

    test("real UserMenu renders Orders navigation link with correct href", async () => {
        await act(async () => {
            renderWithRouter();
        });

        const link = screen.getByRole("link", { name: "Orders" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/user/orders");
    });

    test("successful form submission calls axios.put with correct payload", async () => {
        axios.put.mockResolvedValue({
            data: { updatedUser: { ...MOCK_USER, name: "Jane Updated" } },
        });

        await act(async () => {
            renderWithRouter();
        });

        await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());

        const nameInput = screen.getByPlaceholderText("Enter Your Name");
        await act(async () => {
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, "Jane Updated");
        });

        await act(async () => {
            await userEvent.click(screen.getByRole("button", { name: "UPDATE" }));
        });

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/auth/profile",
                expect.objectContaining({
                    name: "Jane Updated",
                    email: "jane@test.com",
                    phone: "91234567",
                    address: "456 Test Ave",
                })
            );
        });
    });

    test("successful update shows success toast and updates localStorage", async () => {
        const updatedUser = { ...MOCK_USER, name: "Jane Updated" };
        axios.put.mockResolvedValue({ data: { updatedUser } });

        await act(async () => {
            renderWithRouter();
        });

        await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());

        await act(async () => {
            await userEvent.click(screen.getByRole("button", { name: "UPDATE" }));
        });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
        });

        const stored = JSON.parse(localStorage.getItem("auth"));
        expect(stored.user.name).toBe("Jane Updated");
    });

    test("backend error response shows error toast with backend message", async () => {
        axios.put.mockResolvedValue({
            data: { error: "Passsword is required and at least 6 character long" },
        });

        await act(async () => {
            renderWithRouter();
        });

        await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());

        await act(async () => {
            await userEvent.click(screen.getByRole("button", { name: "UPDATE" }));
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Passsword is required and at least 6 character long"
            );
        });
    });

    test("network error shows generic error toast", async () => {
        axios.put.mockRejectedValue(new Error("Network Error"));

        await act(async () => {
            renderWithRouter();
        });

        await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());

        await act(async () => {
            await userEvent.click(screen.getByRole("button", { name: "UPDATE" }));
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });
});
