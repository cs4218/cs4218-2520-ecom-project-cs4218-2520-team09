// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "./Products"; 

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
}));

jest.mock("../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);
jest.mock("../../components/Layout", () => ({ children }) => <div data-testid="layout">{children}</div>);

// Liu, Yiwei, A0332922J
describe("Products Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });
  // Liu, Yiwei, A0332922J
  test("Given a successful API response, When the component mounts, Then it fetches and displays the products list", async () => {
    const mockProducts = [
      { _id: "1", name: "Product A", description: "Description A", slug: "product-a" },
      { _id: "2", name: "Product B", description: "Description B", slug: "product-b" },
    ];
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    expect(screen.getByText("All Products List")).toBeInTheDocument();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    expect(axios.get).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText("Product A")).toBeInTheDocument();
      expect(screen.getByText("Description A")).toBeInTheDocument();
      expect(screen.getByText("Product B")).toBeInTheDocument();
    });

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "/api/v1/product/product-photo/1");
    expect(images[1]).toHaveAttribute("src", "/api/v1/product/product-photo/2");
  });
  // Liu, Yiwei, A0332922J
  test("Given a failed API response, When the component mounts, Then it logs the error and shows a toast notification", async () => {
    const mockError = new Error("Network Error");
    axios.get.mockRejectedValueOnce(mockError);

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(mockError);
      expect(toast.error).toHaveBeenCalledWith("Someething Went Wrong");
    });
  });
});