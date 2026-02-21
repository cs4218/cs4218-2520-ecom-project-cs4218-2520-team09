import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("axios");

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
}));

jest.mock("../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

// react-icons can render invalid elements in jsdom; mock to avoid "Objects are not valid as a React child"
jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span data-testid="reload-icon" />,
}));

import HomePage from "./HomePage";

import axios from "axios";
import { useCart } from "../context/cart";
import { useNavigate } from "react-router-dom";
import { success as toastSuccess } from "react-hot-toast";

describe("HomePage", () => {
  const setCartMock = jest.fn();
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCart).mockReturnValue([[], setCartMock]);
    (useNavigate).mockReturnValue(navigateMock);
    Storage.prototype.setItem = jest.fn();

    const mockCategories = [
      { _id: "c1", name: "Category 1" },
      { _id: "c2", name: "Category 2" },
    ];
    const mockProducts = [
      {
        _id: "p1",
        name: "Product 1",
        description: "Nice product 1 description",
        price: 10,
        slug: "product-1",
      },
    ];

    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: true, category: mockCategories } });
      }
      if (url.includes("product-count")) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes("product-list")) {
        return Promise.resolve({ data: { products: mockProducts } });
      }
      return Promise.resolve({ data: {} });
    });

    (axios.post).mockResolvedValue({ data: { products: mockProducts } });
  });

  it("renders banner, filters and products, and supports navigation and add to cart", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // banner
    const banner = screen.getByAltText("bannerimage");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("src", "/images/Virtual.png");

    // categories loaded
    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
      expect(screen.getByText("Category 2")).toBeInTheDocument();
    });

    // products loaded
    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
    });

    // price display
    expect(screen.getByText("$10.00")).toBeInTheDocument();

    // more details navigation
    fireEvent.click(screen.getByText("More Details"));
    expect(navigateMock).toHaveBeenCalledWith("/product/product-1");

    // add to cart
    fireEvent.click(screen.getByText("ADD TO CART"));
    expect(setCartMock).toHaveBeenCalledWith([
      {
        _id: "p1",
        name: "Product 1",
        description: "Nice product 1 description",
        price: 10,
        slug: "product-1",
      },
    ]);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([
        {
          _id: "p1",
          name: "Product 1",
          description: "Nice product 1 description",
          price: 10,
          slug: "product-1",
        },
      ])
    );
    expect(toastSuccess).toHaveBeenCalledWith("Item Added to cart");

    // load more button visible when total > products.length
    expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
  });

  it("does not set categories when get-category returns success false", async () => {
    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: false } });
      }
      if (url.includes("product-count")) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes("product-list")) {
        return Promise.resolve({ data: { products: [{ _id: "p1", name: "P1", description: "D", price: 1, slug: "p1" }] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    expect(screen.queryByText("Category 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Category 2")).not.toBeInTheDocument();
  });

  it("does not call getAllProducts when both category and price filters are set", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
    });

    const productListCallsBefore = (axios.get).mock.calls.filter((c) => c[0].includes("product-list")).length;

    fireEvent.click(screen.getByRole("checkbox", { name: /Category 1/i }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    const productListCallsAfterCategory = (axios.get).mock.calls.filter((c) => c[0].includes("product-list")).length;
    expect(productListCallsAfterCategory).toBe(productListCallsBefore + 1);

    (axios.get).mockClear();
    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: true, category: [{ _id: "c1", name: "Category 1" }, { _id: "c2", name: "Category 2" }] } });
      }
      if (url.includes("product-count")) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes("product-list")) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    fireEvent.click(screen.getByRole("radio", { name: /^\$0 to 19$/ }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    const productListCallsAfterBoth = (axios.get).mock.calls.filter((c) => c[0].includes("product-list")).length;
    expect(productListCallsAfterBoth).toBe(0);
  });

  it("filters by category checkbox and calls filterProduct", async () => {
    const filteredProducts = [{ _id: "p2", name: "Filtered", description: "Desc", price: 5, slug: "filtered" }];
    (axios.post).mockResolvedValueOnce({ data: { products: filteredProducts } });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
    });

    // Check category checkbox (antd Checkbox wraps label; click the label text to toggle)
    const categoryCheckbox = screen.getByRole("checkbox", { name: /Category 1/i });
    fireEvent.click(categoryCheckbox);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
        checked: ["c1"],
        radio: [],
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Filtered")).toBeInTheDocument();
    });
  });

  it("unchecking category clears filter and refetches all products", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
    });

    const categoryCheckbox = screen.getByRole("checkbox", { name: /Category 1/i });
    fireEvent.click(categoryCheckbox);
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    fireEvent.click(categoryCheckbox);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("product-list/1"));
    });
  });

  it("filters by price radio and calls filterProduct", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    const priceRadio = screen.getByRole("radio", { name: /^\$0 to 19$/ });
    fireEvent.click(priceRadio);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", expect.objectContaining({
        radio: [0, 19],
      }));
    });
  });

  it("RESET FILTERS button calls window.location.reload", async () => {
    delete window.location;
    window.location = { reload: jest.fn() };

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /RESET FILTERS/i }));
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("Loadmore shows Loading ... while fetching and then shows Loadmore again", async () => {
    let resolvePage2;
    const page2Promise = new Promise((resolve) => {
      resolvePage2 = resolve;
    });
    (axios.get).mockImplementation((url) => {
      if (url.includes("product-list/2")) {
        return page2Promise;
      }
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes("product-count")) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes("product-list/1")) {
        return Promise.resolve({ data: { products: [{ _id: "p1", name: "P1", description: "D", price: 1, slug: "p1" }] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Loadmore/i));

    await waitFor(() => {
      expect(screen.getByText("Loading ...")).toBeInTheDocument();
    });

    resolvePage2({ data: { products: [] } });

    await waitFor(() => {
      expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      expect(screen.queryByText("Loading ...")).not.toBeInTheDocument();
    });
  });

  it("filterProduct logs error when POST fails", async () => {
    const err = new Error("filter failed");
    (axios.post).mockRejectedValueOnce(err);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /Category 1/i }));

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(err);
    });

    logSpy.mockRestore();
  });

  it("getAllCategory logs error when get-category fails", async () => {
    const err = new Error("category failed");
    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) return Promise.reject(err);
      if (url.includes("product-count")) return Promise.resolve({ data: { total: 0 } });
      if (url.includes("product-list")) return Promise.resolve({ data: { products: [] } });
      return Promise.resolve({ data: {} });
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(err);
    });

    logSpy.mockRestore();
  });

  it("getAllProducts logs error and sets loading false when product-list fails", async () => {
    const err = new Error("products failed");
    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes("product-count")) {
        return Promise.resolve({ data: { total: 0 } });
      }
      if (url.includes("product-list/1")) {
        return Promise.reject(err);
      }
      return Promise.resolve({ data: {} });
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(err);
    });

    logSpy.mockRestore();
  });

  it("getTotal logs error when product-count fails", async () => {
    const err = new Error("count failed");
    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes("product-count")) return Promise.reject(err);
      if (url.includes("product-list")) return Promise.resolve({ data: { products: [] } });
      return Promise.resolve({ data: {} });
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(err);
    });

    logSpy.mockRestore();
  });

  it("loadMore logs error and sets loading false when page 2 request fails", async () => {
    (axios.get).mockImplementation((url) => {
      if (url.includes("get-category")) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes("product-count")) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes("product-list/1")) {
        return Promise.resolve({ data: { products: [{ _id: "p1", name: "P1", description: "D", price: 1, slug: "p1" }] } });
      }
      if (url.includes("product-list/2")) {
        return Promise.reject(new Error("loadMore failed"));
      }
      return Promise.resolve({ data: {} });
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Loadmore/i));

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(logSpy.mock.calls[0][0].message).toBe("loadMore failed");
    });

    logSpy.mockRestore();
  });
});


