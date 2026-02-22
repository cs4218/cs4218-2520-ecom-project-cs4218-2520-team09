import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import CreateProduct from "./CreateProduct";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("antd", () => {
  const MockSelect = ({ children, onChange, placeholder, bordered, showSearch, ...props }) => {
    return (
      <select
        data-testid={placeholder || "mock-select"}
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
  <div data-testid="layout" title={title}>
    {children}
  </div>
));
jest.mock("./../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

global.URL.createObjectURL = jest.fn(() => "mock_image_url");

//Liu, Yiwei, A0332922J
describe("CreateProduct Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should fetch and display categories on mount", async () => {
    const mockCategories = {
      success: true,
      category: [
        { _id: "1", name: "Electronics" },
        { _id: "2", name: "Books" },
      ],
    };
    axios.get.mockResolvedValue({ data: mockCategories });

    await act(async () => {
      render(<CreateProduct />);
    });

    expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  test("should handle error when fetching categories fails", async () => {
    const error = new Error("Network Error");
    axios.get.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    await act(async () => {
      render(<CreateProduct />);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      );
    });
    expect(consoleSpy).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
  });

  test("should handle form inputs and create product successfully", async () => {
    const mockCategories = {
      success: true,
      category: [{ _id: "1", name: "Electronics" }],
    };
    axios.get.mockResolvedValue({ data: mockCategories });
    axios.post.mockResolvedValue({ data: { success: true } });

    await act(async () => {
      render(<CreateProduct />);
    });

    fireEvent.change(screen.getByTestId(/Select a category/i), {
      target: { value: "1" },
    });

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const inputElement = document.querySelector('input[type="file"]');
    fireEvent.change(inputElement, { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
      target: { value: "Iphone 15" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
      target: { value: "New Apple Phone" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a Price/i), {
      target: { value: "999" },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
      target: { value: "10" },
    });

    fireEvent.change(screen.getByTestId(/Select Shipping/i), {
      target: { value: "1" },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("CREATE PRODUCT"));
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );
    });

    const formData = axios.post.mock.calls[0][1];
    expect(formData.get("name")).toBe("Iphone 15");
    expect(formData.get("description")).toBe("New Apple Phone");
    expect(formData.get("price")).toBe("999");
    expect(formData.get("quantity")).toBe("10");
    expect(formData.get("category")).toBe("1");
    expect(formData.get("shipping")).toBe("1");
    expect(formData.get("photo")).toBe(file);

    expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  test("should handle creation failure response", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    axios.post.mockResolvedValue({
      data: { success: false, message: "Database Error" }
    });

    await act(async () => {
      render(<CreateProduct />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("CREATE PRODUCT"));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Database Error");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("should catch runtime errors during creation", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    axios.post.mockRejectedValue(new Error("Network Error"));

    await act(async () => {
      render(<CreateProduct />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("CREATE PRODUCT"));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

    consoleSpy.mockRestore();
  });
});