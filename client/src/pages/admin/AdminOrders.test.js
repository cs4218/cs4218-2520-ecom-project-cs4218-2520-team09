import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import AdminOrders from "./AdminOrders";
import { useAuth } from "../../context/auth";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-menu">AdminMenu</div>,
}));

jest.mock("moment", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    fromNow: () => "Fixed time ago",
  })),
}));

jest.mock("antd", () => {
  const Select = ({ children, defaultValue, onChange }) => (
    <select
      data-testid="antd-select"
      defaultValue={defaultValue}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );

  const Option = ({ children, value }) => <option value={value}>{children}</option>;
  Select.Option = Option;

  return {
    __esModule: true,
    Select,
  };
});

describe("AdminOrders integration", () => {
  const mockSetAuth = jest.fn();

  const fakeOrders = [
    {
      _id: "order-1",
      status: "Processing",
      buyer: {
        _id: "buyer-1",
        name: "Admin Buyer",
      },
      createdAt: "2026-03-01T10:00:00.000Z",
      payment: {
        success: true,
      },
      products: [
        {
          _id: "product-1",
          name: "Laptop",
          description: "Laptop for testing admin orders page",
          price: 1200,
        },
        {
          _id: "product-2",
          name: "Mouse",
          description: "Mouse for testing admin orders page",
          price: 40,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([
      {
        user: { name: "Admin User", role: 1, email: "admin@example.com" },
        token: "fake-admin-token",
      },
      mockSetAuth,
    ]);
  });

  test("loads and renders mocked orders data on mount", async () => {
    // Liu, Yiwei, A0332922J
    axios.get.mockResolvedValueOnce({ data: fakeOrders });

    render(<AdminOrders />);

    // findByText waits for setOrders to complete (state update inside act)
    expect(await screen.findByText("Admin Buyer")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Fixed time ago")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("changes order status via Ant Design Select and calls axios.put with correct payload", async () => {
    // Liu, Yiwei, A0332922J
    axios.get.mockResolvedValue({ data: fakeOrders });
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<AdminOrders />);

    const select = await screen.findByTestId("antd-select");

    // Wrap the event in act so the async handleChange (put + getOrders) fully completes
    await act(async () => {
      fireEvent.change(select, { target: { value: "Shipped" } });
    });

    expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/order-status/order-1", {
      status: "Shipped",
    });
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});