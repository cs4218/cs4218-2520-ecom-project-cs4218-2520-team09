// Liu, Yiwei, A0332922J
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

window.prompt = jest.fn();
global.URL.createObjectURL = jest.fn(() => "mock-url");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "test-product-slug" }),
}));

describe("UpdateProduct Component Tests", () => {
    let consoleErrorSpy;
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

    beforeEach(() => {
        jest.clearAllMocks();
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

    // Liu, Yiwei, A0332922J
    test("Given product data, When component mounts, Then it fetches and displays data", async () => {
        await renderAndWaitForData();
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product-slug");
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    // Liu, Yiwei, A0332922J
    test("Given form data, When update button is clicked, Then it triggers the update flow", async () => {
        axios.put.mockResolvedValue({ data: { success: true } });

        await renderAndWaitForData();

        fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "New Name" } });
        fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "New Desc" } });
        fireEvent.change(screen.getByPlaceholderText("write a Price"), { target: { value: "999" } });
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "50" } });
        
        // 战略修改：使用正则匹配绕过空格陷阱
        const categorySelect = screen.getByTestId(/Select a category/i);
        fireEvent.change(categorySelect, { target: { value: "cat456" } });
        
        // 战略修改：使用正则匹配绕过空格陷阱
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

    // Liu, Yiwei, A0332922J
    test("Given user confirms delete, When delete button clicked, Then it calls delete API", async () => {
        axios.delete.mockResolvedValue({ data: { success: true } });
        window.prompt.mockReturnValue(true);

        await renderAndWaitForData();

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await waitFor(() => {
            expect(window.prompt).toHaveBeenCalled();
            expect(axios.delete).toHaveBeenCalledWith("/api/v1/product/delete-product/123");
            expect(toast.success).toHaveBeenCalledWith("Product DEleted Succfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    // Liu, Yiwei, A0332922J
    test("Given user cancels delete, When delete button clicked, Then no API call is made", async () => {
        window.prompt.mockReturnValue(false);

        await renderAndWaitForData();

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(window.prompt).toHaveBeenCalled();
        expect(axios.delete).not.toHaveBeenCalled();
    });

    // Liu, Yiwei, A0332922J
    test("Given API failure, When fetching data on mount, Then console logs error", async () => {
        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValue(new Error("Network Error"));

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
        consoleLogSpy.mockRestore();
    });

    // Liu, Yiwei, A0332922J
    test("Given API failure, When deleting product, Then it shows error toast", async () => {
        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.delete.mockRejectedValue(new Error("Delete Failed"));
        window.prompt.mockReturnValue(true);

        await renderAndWaitForData();

        const deleteBtn = screen.getByText("DELETE PRODUCT");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
        consoleLogSpy.mockRestore();
    });

    // Liu, Yiwei, A0332922J
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

    // Liu, Yiwei, A0332922J
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
});