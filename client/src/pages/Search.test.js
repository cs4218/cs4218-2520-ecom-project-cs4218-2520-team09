import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Search from "./Search";
import "@testing-library/jest-dom";

jest.mock("../context/search", () => ({
  useSearch: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("./../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout">
    <h1>{title}</h1>
    {children}
  </div>
));

import { useSearch } from "../context/search";
import { useCart } from "../context/cart";
import { success as toastSuccess } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

describe("Search", () => {
  const mockNavigate = jest.fn();
  const mockSetCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useCart.mockReturnValue([[], mockSetCart]);
    Storage.prototype.setItem = jest.fn();
  });

  it("renders Search Results heading and layout title", () => {
    useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("Search Results")).toBeInTheDocument();
    expect(screen.getByTestId("mock-layout")).toBeInTheDocument();
  });

  it('shows "No Products Found" when results are empty', () => {
    useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("No Products Found")).toBeInTheDocument();
  });

  it("shows found count when results are present", () => {
    const mockResults = [
      {
        _id: "1",
        name: "Test Product",
        description: "A test product description here",
        price: 99,
        slug: "test-product",
      },
    ];
    useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("Found 1")).toBeInTheDocument();
  });

  it("renders product card with name, truncated description, and price", () => {
    const mockResults = [
      {
        _id: "1",
        name: "Nice Laptop",
        description: "This is a very long description that should be cut off",
        price: 1299,
        slug: "nice-laptop",
      },
    ];
    useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("Nice Laptop")).toBeInTheDocument();
    // description.substring(0, 30) + "..." — text nodes may be split, use regex
    expect(
      screen.getByText(/This is a very long descriptio/)
    ).toBeInTheDocument();
    // price rendered as " $ {price}" — text nodes may be split, use regex
    expect(screen.getByText(/\$\s*1299/)).toBeInTheDocument();
  });

  it("renders product image with correct src and alt", () => {
    const mockResults = [
      {
        _id: "abc123",
        name: "Camera",
        description: "A camera product",
        price: 500,
        slug: "camera",
      },
    ];
    useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    const img = screen.getByRole("img", { name: "Camera" });
    expect(img).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/abc123"
    );
  });

  it('navigates to product page when "More Details" is clicked', () => {
    const mockResults = [
      {
        _id: "1",
        name: "Shoe",
        description: "A comfortable shoe",
        price: 50,
        slug: "shoe",
      },
    ];
    useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("More Details"));
    expect(mockNavigate).toHaveBeenCalledWith("/product/shoe");
  });

  it("adds product to cart and updates localStorage when ADD TO CART is clicked", () => {
    const product = {
      _id: "1",
      name: "Book",
      description: "An interesting book",
      price: 20,
      slug: "book",
    };
    useSearch.mockReturnValue([{ results: [product] }, jest.fn()]);
    useCart.mockReturnValue([[], mockSetCart]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("ADD TO CART"));

    expect(mockSetCart).toHaveBeenCalledWith([product]);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([product])
    );
    expect(toastSuccess).toHaveBeenCalledWith("Item Added to cart");
  });

  it("renders multiple product cards", () => {
    const mockResults = [
      {
        _id: "1",
        name: "Product A",
        description: "Description for product A",
        price: 10,
        slug: "product-a",
      },
      {
        _id: "2",
        name: "Product B",
        description: "Description for product B",
        price: 20,
        slug: "product-b",
      },
    ];
    useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("Found 2")).toBeInTheDocument();
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
    expect(screen.getAllByText("More Details")).toHaveLength(2);
    expect(screen.getAllByText("ADD TO CART")).toHaveLength(2);
  });
});
