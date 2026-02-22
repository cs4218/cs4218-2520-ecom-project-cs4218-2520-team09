import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../hooks/useCategory", () => jest.fn());

jest.mock("./Form/SearchInput", () => () => (
  <div data-testid="search-input">SearchInput</div>
));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
}));

jest.mock("antd", () => ({
  Badge: ({ children, count }) => (
    <div data-testid="badge">
      <span data-testid="badge-count">{count}</span>
      {children}
    </div>
  ),
}));

import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import useCategory from "../hooks/useCategory";
import { success as toastSuccess } from "react-hot-toast";

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCart).mockReturnValue([[1, 2, 3], jest.fn()]);
    (useCategory).mockReturnValue([
      { slug: "cat-1", name: "Cat 1" },
      { slug: "cat-2", name: "Cat 2" },
    ]);
    Storage.prototype.removeItem = jest.fn();
  });

  it("shows register and login links when user is not authenticated", () => {
    (useAuth).mockReturnValue([{ user: null }, jest.fn()]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("shows user dropdown, dashboard link and logout when user is authenticated", () => {
    const setAuthMock = jest.fn();
    (useAuth).mockReturnValue([
      {
        user: { name: "Admin", role: 1 },
        token: "token",
      },
      setAuthMock,
    ]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Logout"));

    expect(setAuthMock).toHaveBeenCalledWith({
      user: null,
      token: "",
    });
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith("auth");
    expect(toastSuccess).toHaveBeenCalledWith("Logout Successfully");
  });

  it("renders categories dropdown and cart badge count", () => {
    (useAuth).mockReturnValue([{ user: null }, jest.fn()]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("Cat 1")).toBeInTheDocument();
    expect(screen.getByText("Cat 2")).toBeInTheDocument();

    expect(screen.getByTestId("badge-count")).toHaveTextContent("3");
  });
});


