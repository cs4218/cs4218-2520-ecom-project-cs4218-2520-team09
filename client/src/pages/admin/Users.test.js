import React from "react";
import { render, screen } from "@testing-library/react";
import Users from "./Users";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [
    {
      user: { name: "Admin", email: "admin@test.com", phone: "1234567890" },
      token: "token",
    },
    jest.fn(),
  ]),
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    <div data-testid="layout-title">{title}</div>
    {children}
  </div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">Admin Menu</div>
));

describe("Admin Users page", () => {
  it("renders Layout, AdminMenu and heading", () => {
    render(<Users />);

    // Layout wrapper is rendered
    expect(screen.getByTestId("layout")).toBeInTheDocument();

    // Title prop is passed to Layout
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "Dashboard - All Users"
    );

    // Admin menu column
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    // Main heading
    expect(screen.getByText("All Users")).toBeInTheDocument();
  });
});


