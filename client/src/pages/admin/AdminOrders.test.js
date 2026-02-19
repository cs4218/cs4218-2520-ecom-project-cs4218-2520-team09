// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import AdminOrders from "./AdminOrders"; 
import { useAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("../../components/Layout", () => ({ children }) => <div>{children}</div>);
jest.mock("../../components/AdminMenu", () => () => <div>AdminMenu</div>);
jest.mock("moment", () => () => ({
  fromNow: () => "a day ago",
}));

jest.mock("antd", () => {
  const Select = ({ children, onChange, defaultValue, "data-testid": testId }) => (
    <select
      data-testid={testId || "mock-select"}
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
  Select.Option = ({ children, value }) => <option value={value}>{children}</option>;
  return { Select, Option: Select.Option };
});

describe("AdminOrders Component", () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  const mockOrders = [
    {
      _id: "order1",
      status: "Processing",
      buyer: { name: "User A" },
      createAt: "2026-01-01T00:00:00.000Z",
      payment: { success: true }, 
      products: [
        {
          _id: "prod1",
          name: "Test Product",
          description: "This is a very long description that needs to be substringed in the UI.",
          price: 99,
        },
      ],
    },
    {
      _id: "order2",
      status: "Not Process",
      buyer: { name: "User B" },
      createAt: "2026-01-02T00:00:00.000Z",
      payment: { success: false }, 
      products: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });
  // Liu, Yiwei, A0332922J
  test("Given valid auth token, When component mounts, Then it fetches and renders orders successfully", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: mockOrders });
    render(<AdminOrders />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
    expect(screen.getByText("User A")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });
  // Liu, Yiwei, A0332922J
  test("Given no auth token, When component mounts, Then it does not fetch orders", () => {
    useAuth.mockReturnValue([{}, jest.fn()]);
    render(<AdminOrders />);
    expect(axios.get).not.toHaveBeenCalled();
  });
  // Liu, Yiwei, A0332922J
  test("Given valid auth token, When fetching orders fails, Then it logs the error", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    const error = new Error("Network Error");
    axios.get.mockRejectedValueOnce(error);
    render(<AdminOrders />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });
  // Liu, Yiwei, A0332922J
  test("Given rendered orders, When admin changes order status successfully, Then it calls PUT api and refetches orders", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: mockOrders }); 
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    
    render(<AdminOrders />);
    await waitFor(() => {
      expect(screen.getByText("User A")).toBeInTheDocument();
    });
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "Shipped" } });
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(`/api/v1/auth/order-status/order1`, {
        status: "Shipped",
      });
      expect(axios.get).toHaveBeenCalledTimes(2); 
    });
  });
  // Liu, Yiwei, A0332922J
  test("Given rendered orders, When changing order status fails, Then it logs the error", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: mockOrders });
    const error = new Error("PUT Request Failed");
    axios.put.mockRejectedValueOnce(error);
    
    render(<AdminOrders />);
    
    await waitFor(() => {
      expect(screen.getByText("User A")).toBeInTheDocument();
    });
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "Shipped" } });
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });
});