// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  default: () => ({
    fromNow: () => "a day ago",
  }),
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
  return { 
    __esModule: true,
    Select, 
    Option: Select.Option 
  };
});

//Liu, Yiwei, A0332922J
describe("AdminOrders Component", () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  const mockOrders = [
    {
      _id: "order1",
      status: "Processing",
      buyer: { name: "User A" },
      createdAt: "2026-01-01T00:00:00.000Z",
      payment: { success: true }, 
      products: [
        {
          _id: "prod1",
          name: "Test Product",
          description: "This is a very long description that needs to be substringed in the UI.",
          price: 99,
        },
        {
          _id: "prod2",
          name: "No Description Product",
          price: 49,
        }
      ],
    },
    {
      _id: "order2",
      status: "Not Processed",
      buyer: { name: "User B" },
      createdAt: "2026-01-02T00:00:00.000Z",
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

  test("Given valid auth token, When component mounts, Then it fetches and renders orders successfully", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: mockOrders });
    render(<AdminOrders />);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
    
    expect(await screen.findByText("User A")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("No Description Product")).toBeInTheDocument();
  });

  test("Given no auth token, When component mounts, Then it does not fetch orders", () => {
    useAuth.mockReturnValue([{}, jest.fn()]);
    render(<AdminOrders />);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("Given valid auth token, When fetching orders fails, Then it logs the error", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    const error = new Error("Network Error");
    axios.get.mockRejectedValueOnce(error);
    render(<AdminOrders />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });

  test("Given rendered orders, When admin changes order status successfully, Then it calls PUT api and refetches orders", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: mockOrders }); 
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    
    render(<AdminOrders />);
    
    expect(await screen.findByText("User A")).toBeInTheDocument();
    
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "Shipped" } });
    
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(`/api/v1/auth/order-status/order1`, {
        status: "Shipped",
      });
      expect(axios.get).toHaveBeenCalledTimes(2); 
    });
  });

  test("Given rendered orders, When changing order status fails, Then it logs the error", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: mockOrders });
    const error = new Error("PUT Request Failed");
    axios.put.mockRejectedValueOnce(error);
    
    render(<AdminOrders />);
    
    expect(await screen.findByText("User A")).toBeInTheDocument();
    
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "Shipped" } });
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });

  test("Given valid auth token, When API returns empty orders, Then it renders without crashing", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: [] });
    render(<AdminOrders />);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
    
    expect(screen.queryByTestId("mock-select")).not.toBeInTheDocument();
  });

  test("Given order data missing critical fields like _id and buyer, When rendered, Then it utilizes fallbacks without crashing", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    const dirtyOrders = [
      {
        status: "Processing",
        payment: { success: false },
        createdAt: "2026-01-01T00:00:00.000Z",
      }
    ];
    axios.get.mockResolvedValueOnce({ data: dirtyOrders });
    
    render(<AdminOrders />);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    // 使用 findByText 异步等待 DOM 更新
    expect(await screen.findByText("Failed")).toBeInTheDocument();
  });

  test("Given API returns null instead of an array, When rendered, Then optional chaining prevents mapping crashes", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: null });
    
    render(<AdminOrders />);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  test("Given auth object itself is null, When component mounts, Then optional chaining safely skips fetching", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    
    render(<AdminOrders />);
    
    expect(axios.get).not.toHaveBeenCalled();
  });
});