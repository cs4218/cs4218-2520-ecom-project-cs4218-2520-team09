// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "../../pages/admin/CreateCategory";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" data-title={title}>
    {children}
  </div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">Admin Menu</div>
));

jest.mock("antd", () => ({
  Modal: ({ children, open, visible, title }) =>
    open || visible ? (
      <div data-testid="antd-modal" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

// Liu, Yiwei, A0332922J
describe("CreateCategory Bottom-Up Integration", () => {
  const existingCategories = [
    { _id: "cat-1", name: "Electronics" },
    { _id: "cat-2", name: "Books" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: { success: true, category: existingCategories },
    });
    axios.post.mockResolvedValue({
      data: { success: true, category: { _id: "cat-3", name: "Gaming" } },
    });
  });

  // Liu, Yiwei, A0332922J
  test("renders real CategoryForm, submits typed value, and posts integrated parent state", async () => {
    render(<CreateCategory />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();
    });

    const categoryInput = screen.getByPlaceholderText(/enter new category/i);
    await act(async () => {
      await userEvent.type(categoryInput, "Gaming");
    });
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "Gaming" }
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Gaming is created");
  });
});
