import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import UpdateProduct from "./UpdateProduct";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("antd", () => {
    const MockSelect = ({ children, onChange, placeholder, bordered, showSearch, value, ...props }) => {
        return (
            <select
                data-testid={placeholder || "mock-select"}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                {...props}
            >
                {children}
            </select>
        );
    };
    const MockOption = ({ children, value }) => (
        <option value={value}>{children}</option>
    );
    MockSelect.Option = MockOption;
    return { Select: MockSelect };
});

jest.mock("./../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">
        <h1>{title}</h1>
        {children}
    </div>
));
jest.mock("./../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);

window.confirm = jest.fn();
global.URL.createObjectURL = jest.fn(() => "mock-url");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "test-product-slug" }),
}));

//Liu, Yiwei, A0332922J
describe("UpdateProduct Component Tests", () => {
    let consoleErrorSpy;
    let consoleLogSpy;

    beforeAll(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((msg) => {
            if (
                typeof msg === "string" &&
                (msg.includes("deprecated") ||
                    msg.includes("uncontrolled") ||
                    msg.includes("non-boolean attribute") ||
                    msg.includes("React does not recognize"))
            ) {
                return;
            }
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: defaultMockProduct } });
            }
            if (url.includes("get-category")) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });

    const defaultMockProduct = {
        _id: "123",
        name: "Default Name",
        description: "Default Desc",
        price: 100,
        quantity: 10,
        shipping: "1",
        category: { _id: "cat123", name: "Electronics" },
    };

    const mockCategories = [
        { _id: "cat123", name: "Electronics" },
        { _id: "cat456", name: "Books" }
    ];

    const renderAndWaitForData = async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });
        await waitFor(() => {
            expect(screen.getByPlaceholderText("write a name")).toHaveValue("Default Name");
        });
    };

    test("Given product data, When component mounts, Then it fetches and displays data", async () => {
        await renderAndWaitForData();
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product-slug");
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    test("Given form data, When update button is clicked and succeeds, Then it navigates and shows success toast", async () => {
        axios.put.mockResolvedValue({ data: { success: true } });

        await renderAndWaitForData();

        fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "New Name" } });
        fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "New Desc" } });
        fireEvent.change(screen.getByPlaceholderText("write a Price"), { target: { value: "999" } });
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "50" } });
        
        const categorySelect = screen.getByTestId(/Select a category/i);
        fireEvent.change(categorySelect, { target: { value: "cat456" } });
        
        const shippingSelect = screen.getByTestId(/Select Shipping/i);
        fireEvent.change(shippingSelect, { target: { value: "0" } });

        const updateBtn = screen.getByText("UPDATE PRODUCT");
        
        await act(async () => {
            fireEvent.click(updateBtn);
        });

        expect(axios.put).toHaveBeenCalledWith(
            "/api/v1/product/update-product/123",
            expect.any(FormData)
        );
        
        expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    test("Given form data, When update button is clicked but API returns false success, Then it shows error message", async () => {
        axios.put.mockResolvedValue({ data: { success: false, message: "Update Failed by Backend" } });

        await renderAndWaitForData();

        const updateBtn = screen.getByText("UPDATE PRODUCT");
        await act(async () => {
            fireEvent.click(updateBtn);
        });

        expect(toast.error).toHaveBeenCalledWith("Update Failed by Backend");
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("Given form data, When update API rejects, Then it shows catch block error toast", async () => {
        axios.put.mockRejectedValue(new Error("Network Error"));

        await renderAndWaitForData();

        const updateBtn = screen.getByText("UPDATE PRODUCT");
        await act(async () => {
            fireEvent.click(updateBtn);
        });

        expect(toast.error).toHaveBeenCalledWith("something went wrong");
    });

    test("Given user confirms delete, When delete button clicked, Then it calls delete API", async () => {
        axios.delete.mockResolvedValue({ data: { success: true } });
        window.confirm.mockReturnValue(true);

        await renderAndWaitForData();

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(axios.delete).toHaveBeenCalledWith("/api/v1/product/delete-product/123");
            expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    test("Given user cancels delete, When delete button clicked, Then no API call is made", async () => {
        window.confirm.mockReturnValue(false);

        await renderAndWaitForData();

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(axios.delete).not.toHaveBeenCalled();
    });

    test("Given API failure, When fetching product data on mount, Then console logs error", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) return Promise.reject(new Error("Product Fetch Error"));
            return Promise.resolve({ data: {} });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    test("Given API failure, When fetching categories on mount, Then it shows error toast", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) return Promise.resolve({ data: { product: defaultMockProduct } });
            if (url.includes("get-category")) return Promise.reject(new Error("Category Fetch Error"));
            return Promise.resolve({ data: {} });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");
        });
    });

    test("Given API failure, When deleting product, Then it shows error toast", async () => {
        axios.delete.mockRejectedValue(new Error("Delete Failed"));
        window.confirm.mockReturnValue(true);

        await renderAndWaitForData();

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    test("Given a file, When uploaded, Then photo state updates and displays", async () => {
        await renderAndWaitForData();

        const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
        const fileInput = document.querySelector('input[type="file"]');

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        await waitFor(() => {
            const images = screen.getAllByRole("img");
            expect(images[0]).toHaveAttribute("src", "mock-url");
        });
    });

    test("Given product with no shipping, When component mounts, Then false branch of shipping is hit", async () => {
        const noShippingProduct = { ...defaultMockProduct, shipping: false };
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: noShippingProduct } });
            }
            if (url.includes("get-category")) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: {} });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText("write a name")).toHaveValue("Default Name");
        });

        const shippingSelect = screen.getByTestId(/Select Shipping/i);
        expect(shippingSelect).toHaveValue("0"); 
    });

    test("Given form data with photo, When update button is clicked, Then it appends photo to FormData and calls API", async () => {
        axios.put.mockResolvedValue({ data: { success: true } });
        await renderAndWaitForData();

        const file = new File(["dummy"], "test.png", { type: "image/png" });
        const fileInput = document.querySelector('input[type="file"]');
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        const updateBtn = screen.getByText("UPDATE PRODUCT");
        await act(async () => {
            fireEvent.click(updateBtn);
        });

        expect(axios.put).toHaveBeenCalledWith(
            "/api/v1/product/update-product/123",
            expect.any(FormData)
        );
    });

    test("Given API returns false success for category, When component mounts, Then categories are not set", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) return Promise.resolve({ data: { product: defaultMockProduct } });
            if (url.includes("get-category")) return Promise.resolve({ data: { success: false } });
            return Promise.resolve({ data: {} });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <UpdateProduct />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText("write a name")).toHaveValue("Default Name");
        });
    });
});