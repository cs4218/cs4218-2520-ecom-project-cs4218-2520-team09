/*
 * Bottom-Up Integration Test: Categories Component + useCategory Hook
 *
 * Approach: Bottom-Up Integration
 * We compose the real useCategory hook (the lower-level unit) with the
 * Categories component (the higher-level unit) without mocking the hook.
 * The only external boundary mocked is axios.get, which replaces the actual
 * network call made inside useCategory. This test proves that:
 *   1. useCategory correctly fetches from the mocked axios endpoint and stores
 *      the result in local state.
 *   2. Categories correctly consumes the hook's returned array and renders a
 *      <Link> for every category in that array.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";

import Categories from "../../pages/Categories";

// Mock axios so the real network call inside useCategory is intercepted.
// useCategory itself is NOT mocked – it runs its real logic against this stub.
jest.mock("axios");

// Mock Layout to avoid pulling in Header/Footer/Helmet dependencies.
jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" data-title={title}>
    {children}
  </div>
));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const renderCategories = () =>
  render(
    <MemoryRouter>
      <Categories />
    </MemoryRouter>
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Bottom-Up Integration: Categories component + useCategory hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a Link for each category returned by the integrated hook", async () => {
    // Liu, Yiwei, A0332922J
    const mockCategories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Books", slug: "books" },
      { _id: "3", name: "Furniture", slug: "furniture" },
    ];

    axios.get.mockResolvedValue({
      data: { category: mockCategories },
    });

    renderCategories();

    // useCategory fires axios.get inside useEffect after mount
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });

    // After the hook resolves, Categories should render one Link per category
    for (const cat of mockCategories) {
      const link = await screen.findByRole("link", { name: cat.name });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", `/category/${cat.slug}`);
    }
  });

  it("renders no links when the API returns an empty category array", async () => {
    // Liu, Yiwei, A0332922J
    axios.get.mockResolvedValue({
      data: { category: [] },
    });

    renderCategories();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders no links when the API call fails and hook falls back to empty state", async () => {
    // Liu, Yiwei, A0332922J
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    axios.get.mockRejectedValue(new Error("Network error"));

    renderCategories();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });

    // Hook catches the error and leaves categories as [] – no links should appear
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("renders a single category link with correct href when one category is returned", async () => {
    // Liu, Yiwei, A0332922J
    axios.get.mockResolvedValue({
      data: { category: [{ _id: "99", name: "Gaming", slug: "gaming" }] },
    });

    renderCategories();

    const link = await screen.findByRole("link", { name: "Gaming" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/category/gaming");
  });
});
