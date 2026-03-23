/*
 * Integration Tests: HomePage
 *
 * Approach: Bottom-Up Integration
 *
 * HomePage is composed with its real internal collaborators:
 *   - CartProvider / useCart  – real context; Add To Cart writes to real state
 *   - Prices                  – real static data driving the price-filter radios
 *   - MemoryRouter            – real router so useNavigate works without mocking
 *
 * The ONLY boundaries mocked are:
 *   - axios          – intercepts the three network calls
 *                      (get-category, product-count, product-list, product-filters)
 *   - Layout         – replaced with a passthrough to avoid pulling in
 *                      Header / Footer / react-helmet dependencies
 *   - react-hot-toast – replaced to assert toast calls without real DOM toasts
 *   - matchMedia     – jsdom does not implement it; antd reads it at mount time
 *
 * Jinhan Wu, A0266075Y
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";

import { CartProvider } from "../../context/cart";
import HomePage from "../../pages/HomePage";

// ── External-boundary mocks ──────────────────────────────────────────────────

jest.mock("axios");
jest.mock("react-hot-toast");

// Layout is mocked to isolate HomePage from Header/Footer complexity.
jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

// jsdom does not implement matchMedia; antd reads it at mount time.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { _id: "cat1", name: "Electronics", slug: "electronics" },
  { _id: "cat2", name: "Books", slug: "books" },
];

const PRODUCTS_PAGE_1 = [
  {
    _id: "p1",
    name: "Wireless Headphones",
    description: "Great sound quality headphones for everyday use",
    price: 49,
    slug: "wireless-headphones",
  },
  {
    _id: "p2",
    name: "JavaScript Book",
    description: "Learn JavaScript from scratch with practical examples",
    price: 25,
    slug: "javascript-book",
  },
];

const PRODUCTS_PAGE_2 = [
  {
    _id: "p3",
    name: "Mechanical Keyboard",
    description: "Tactile mechanical keyboard with RGB lighting",
    price: 89,
    slug: "mechanical-keyboard",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Stubs axios for the standard happy-path (2 products on page 1, total = 10).
 * Individual tests can override specific URLs as needed.
 */
function stubAxios({
  categories = CATEGORIES,
  products = PRODUCTS_PAGE_1,
  total = 10,
} = {}) {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({ data: { success: true, category: categories } });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total } });
    }
    if (url.startsWith("/api/v1/product/product-list")) {
      return Promise.resolve({ data: { products } });
    }
    return Promise.resolve({ data: {} });
  });

  axios.post.mockResolvedValue({ data: { products } });
}

function renderHomePage() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <HomePage />
      </CartProvider>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Bottom-Up Integration: HomePage + CartProvider + Prices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    stubAxios();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  // Verifies the initial render: categories are fetched and shown as checkboxes,
  // products are fetched and shown as cards, and the Prices filter radios are
  // present (real Prices component integrated).
  test("Test 1: renders category checkboxes, price radios, and product cards on mount", async () => {
    renderHomePage();

    // Page heading
    expect(screen.getByText("All Products")).toBeInTheDocument();

    // Category checkboxes populated from the API (real useCategory data flow)
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /Electronics/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Books/i })).toBeInTheDocument();
    });

    // Price radios populated from the real Prices constant
    expect(screen.getByRole("radio", { name: /\$0 to 19/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /\$20 to 39/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /\$100 or more/i })).toBeInTheDocument();

    // Product cards loaded from the API
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
      expect(screen.getByText("JavaScript Book")).toBeInTheDocument();
    });

    // Prices formatted correctly
    expect(screen.getByText("$49.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();

    // Descriptions truncated to 60 chars
    expect(
      screen.getByText("Great sound quality headphones for everyday use...")
    ).toBeInTheDocument();

    // Load More button shown because products.length (2) < total (10)
    expect(screen.getByRole("button", { name: /Loadmore/i })).toBeInTheDocument();
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  // Verifies Add To Cart integrates with the real CartProvider:
  // clicking the button updates cart state and persists to localStorage.
  test("Test 2: Add To Cart integrates with CartProvider and updates localStorage", async () => {
    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    // Act: click the first product's ADD TO CART button
    const addButtons = screen.getAllByRole("button", { name: /ADD TO CART/i });
    fireEvent.click(addButtons[0]);

    // Assert: toast was called (real integration between button handler and toast)
    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");

    // Assert: localStorage was updated with the product (CartProvider reads localStorage on mount)
    const stored = JSON.parse(localStorage.getItem("cart"));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Wireless Headphones");
    expect(stored[0]._id).toBe("p1");
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  // Correct behaviour: when a category filter is active, only filterProduct (POST)
  // should be called — getAllProducts (GET product-list) must NOT fire.
  //
  // BUG in current code: line 89 uses `||` instead of `&&`, so getAllProducts()
  // is called even when a filter is active, overwriting filtered results with the
  // full product list.  This test will FAIL against the buggy implementation.
  test("Test 3: checking a category fires filterProduct only — getAllProducts must not run", async () => {
    renderHomePage();

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /Electronics/i })).toBeInTheDocument();
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    // Reset call history so we only track calls triggered by the filter action
    axios.get.mockClear();

    // Arrange: return only Electronics products from the filter endpoint
    const filteredProducts = [
      {
        _id: "p1",
        name: "Wireless Headphones",
        description: "Great sound quality headphones for everyday use",
        price: 49,
        slug: "wireless-headphones",
      },
    ];
    axios.post.mockResolvedValueOnce({ data: { products: filteredProducts } });

    // Act: check the Electronics category
    fireEvent.click(screen.getByRole("checkbox", { name: /Electronics/i }));

    // Assert: filterProduct (POST) called with the correct payload
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        { checked: ["cat1"], radio: [] }
      );
    });

    // Assert: getAllProducts (GET product-list) must NOT have been called again —
    // the filter is active so resetting to all products would be incorrect.
    const productListCalls = axios.get.mock.calls.filter((c) =>
      c[0].includes("product-list")
    );
    expect(productListCalls).toHaveLength(0);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  // Correct behaviour: when a price filter is active, only filterProduct (POST)
  // should be called — getAllProducts (GET product-list) must NOT fire.
  //
  // BUG in current code: same `||` bug means getAllProducts() fires spuriously
  // when a price radio is selected with no category checked.
  // This test will FAIL against the buggy implementation.
  test("Test 4: selecting a price radio fires filterProduct only — getAllProducts must not run", async () => {
    renderHomePage();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    // Reset call history
    axios.get.mockClear();

    // Act: select the "$40 to 59" price band
    fireEvent.click(screen.getByRole("radio", { name: /\$40 to 59/i }));

    // Assert: filterProduct (POST) called with the correct price range
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        expect.objectContaining({ radio: [40, 59] })
      );
    });

    // Assert: getAllProducts (GET product-list) must NOT have been called —
    // price filter is active so resetting to all products would lose the filter.
    const productListCalls = axios.get.mock.calls.filter((c) =>
      c[0].includes("product-list")
    );
    expect(productListCalls).toHaveLength(0);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  // Verifies Load More: clicking the button fetches page 2 and appends the new
  // products to the existing list rather than replacing it.
  test("Test 5: Load More button fetches page 2 and appends products to the list", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: CATEGORIES } });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url === "/api/v1/product/product-list/1") {
        return Promise.resolve({ data: { products: PRODUCTS_PAGE_1 } });
      }
      if (url === "/api/v1/product/product-list/2") {
        return Promise.resolve({ data: { products: PRODUCTS_PAGE_2 } });
      }
      return Promise.resolve({ data: {} });
    });

    renderHomePage();

    // Wait for initial products to appear
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    // Act: click Load More
    fireEvent.click(screen.getByRole("button", { name: /Loadmore/i }));

    // Assert: page 2 request fired
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
    });

    // Assert: page 2 product appended alongside page 1 products
    await waitFor(() => {
      expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    });
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    expect(screen.getByText("JavaScript Book")).toBeInTheDocument();
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  // Verifies that when the API returns no categories the filter section shows
  // no checkboxes (the real mapping produces an empty list).
  test("Test 6: renders no category checkboxes when API returns empty categories", async () => {
    stubAxios({ categories: [], products: PRODUCTS_PAGE_1, total: 2 });

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    // No category checkboxes should be present
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    // Price radios still present (from real Prices constant, not the API)
    expect(screen.getByRole("radio", { name: /\$0 to 19/i })).toBeInTheDocument();
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  // Verifies that the Load More button is hidden when all products are already
  // displayed (products.length >= total).
  test("Test 7: Load More button is hidden when all products are already displayed", async () => {
    // total equals the number of products returned → no more to load
    stubAxios({ products: PRODUCTS_PAGE_1, total: PRODUCTS_PAGE_1.length });

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /Loadmore/i })).not.toBeInTheDocument();
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────
  // Verifies that RESET FILTERS calls window.location.reload — the real button
  // onClick handler integrated with the browser API.
  test("Test 8: RESET FILTERS button calls window.location.reload", async () => {
    const reloadMock = jest.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { reload: reloadMock },
    });

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /RESET FILTERS/i }));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
