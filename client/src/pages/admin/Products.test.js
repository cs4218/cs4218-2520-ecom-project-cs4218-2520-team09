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

//Liu, Yiwei, A0332922J
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
    
    await waitFor(() => {
      expect(screen.getByText("Product A")).toBeInTheDocument();
      expect(screen.getByText("Product B")).toBeInTheDocument();
    });

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "/api/v1/product/product-photo/1");
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
      // Liu, Yiwei, A0332922J: Updated to match fixed typo
      //Liu, Yiwei, A0332922J
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  // Liu, Yiwei, A0332922J
  test("Given an empty product list, When the component mounts, Then it renders without crashing", async () => {
    axios.get.mockResolvedValueOnce({ data: { products: [] } });

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  //Liu, Yiwei, A0332922J
  test("Given a successful API response with undefined products, When the component mounts, Then it handles optional chaining safely", async () => {
    axios.get.mockResolvedValueOnce({ data: {} });

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});