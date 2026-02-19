// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import UpdateProduct from "./UpdateProduct";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("./../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">
        <h1>{title}</h1>
        {children}
    </div>
));
jest.mock("./../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);

window.prompt = jest.fn();

global.URL.createObjectURL = jest.fn(() => "mock-url");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "test-product-slug" }),
}));

describe("UpdateProduct Component Tests", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Liu, Yiwei, A0332922J
    test("Given product data, When component mounts, Then it fetches and displays data", async () => {
        const mockProduct = {
            _id: "123",
            name: "Test Laptop",
            description: "Best laptop",
            price: 1000,
            quantity: 10,
            shipping: true,
            category: { _id: "cat123", name: "Electronics" },
        };
        const mockCategories = [{ _id: "cat123", name: "Electronics" }];

        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes("get-category")) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.reject(new Error("Unknown URL"));
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product-slug");
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");

        await waitFor(() => {
            expect(screen.getByPlaceholderText("write a name")).toHaveValue("Test Laptop");
            expect(screen.getByPlaceholderText("write a description")).toHaveValue("Best laptop");
        });
    });

    // Liu, Yiwei, A0332922J
    test("Given form data, When update button is clicked, Then it sends PUT request", async () => {
        axios.get.mockResolvedValue({ data: { product: {}, category: {} } });
        axios.put.mockReturnValue(Promise.resolve({ data: { success: true } }));

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "New Name" } });
        fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "New Desc" } });
        fireEvent.change(screen.getByPlaceholderText("write a Price"), { target: { value: "999" } });
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "50" } });

        const updateBtn = screen.getByText("UPDATE PRODUCT");
        fireEvent.click(updateBtn);

        expect(axios.put).toHaveBeenCalled();

        const formDataArg = axios.put.mock.calls[0][1];
        expect(formDataArg).toBeInstanceOf(FormData);
        expect(formDataArg.get("name")).toBe("New Name");

        expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
    // Liu, Yiwei, A0332922J
    test("Given user confirms delete, When delete button clicked, Then it calls delete API", async () => {
        axios.get.mockResolvedValue({ data: { product: { _id: "123" } } });
        axios.delete.mockResolvedValue({ data: { success: true } });

        window.prompt.mockReturnValue(true);

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(window.prompt).toHaveBeenCalled();
        expect(axios.delete).toHaveBeenCalledWith("/api/v1/product/delete-product/123");
        expect(toast.success).toHaveBeenCalledWith("Product DEleted Succfully");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    // Liu, Yiwei, A0332922J
    test("Given user cancels delete, When delete button clicked, Then no API call is made", async () => {
        axios.get.mockResolvedValue({ data: { product: { _id: "123" } } });
        window.prompt.mockReturnValue(false);

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        fireEvent.click(deleteBtn);

        expect(window.prompt).toHaveBeenCalled();
        expect(axios.delete).not.toHaveBeenCalled();
    });
    // Liu, Yiwei, A0332922J
    test("Given API failure, When fetching data, Then console logs error", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValue(new Error("Network Error"));

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
    // Liu, Yiwei, A0332922J
    test("Given API failure, When deleting, Then shows error toast", async () => {
        axios.get.mockResolvedValue({ data: { product: { _id: "123" } } });
        axios.delete.mockRejectedValue(new Error("Delete Failed"));
        window.prompt.mockReturnValue(true);

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
    // Liu, Yiwei, A0332922J
    test("Given a file, When uploaded, Then photo state updates", async () => {
        axios.get.mockResolvedValue({ data: { product: {} } });
        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });

        const fileInput = document.querySelector('input[type="file"]');

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        const images = screen.getAllByRole("img");
        expect(images[0]).toHaveAttribute("src", "mock-url");
    });
});