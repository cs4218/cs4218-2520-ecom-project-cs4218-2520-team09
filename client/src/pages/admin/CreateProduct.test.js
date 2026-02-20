// Liu, Yiwei, A0332922J
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

describe("CreateProduct Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Liu, Yiwei, A0332922J
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

  // Liu, Yiwei, A0332922J
  test("should handle error when fetching categories fails", async () => {
    const error = new Error("Network Error");
    axios.get.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    await act(async () => {
      render(<CreateProduct />);
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Something wwent wrong in getting catgeory"
    );
    expect(consoleSpy).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
  });

  // Liu, Yiwei, A0332922J
  test("should handle form inputs and create product successfully (Else Branch Logic)", async () => {
    const mockCategories = {
      success: true,
      category: [{ _id: "1", name: "Electronics" }],
    };
    axios.get.mockResolvedValue({ data: mockCategories });

    axios.post.mockReturnValue({ data: { success: false } });

    await act(async () => {
      render(<CreateProduct />);
    });

    fireEvent.change(screen.getByTestId("Select a category"), {
      target: { value: "1" },
    });

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/Upload Photo/i);
    const inputElement = document.querySelector('input[type="file"]');
    fireEvent.change(inputElement, { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Iphone 15" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "New Apple Phone" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "999" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    fireEvent.change(screen.getByTestId("Select Shipping"), {
      target: { value: "1" },
    });

    const submitBtn = screen.getByText("CREATE PRODUCT");
    fireEvent.click(submitBtn);

    expect(axios.post).toHaveBeenCalledWith(
      "/api/v1/product/create-product",
      expect.any(FormData)
    );
    expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");

    expect(screen.getByAltText("product_photo")).toBeInTheDocument();
  });

  // Liu, Yiwei, A0332922J
  test("should handle creation failure response (If Branch Logic)", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    axios.post.mockReturnValue({
      data: { success: true, message: "Database Error" }
    });

    await act(async () => {
      render(<CreateProduct />);
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));
    expect(toast.error).toHaveBeenCalledWith("Database Error");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Liu, Yiwei, A0332922J
  test("should catch runtime errors during creation", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    axios.post.mockImplementation(() => {
      throw new Error("Synchronous Error");
    });

    await act(async () => {
      render(<CreateProduct />);
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(toast.error).toHaveBeenCalledWith("something went wrong");

    consoleSpy.mockRestore();
  });
});