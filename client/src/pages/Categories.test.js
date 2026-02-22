import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Categories from "../pages/Categories";
import useCategory from "../hooks/useCategory";
import "@testing-library/jest-dom";

jest.mock("../hooks/useCategory");
jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout">
    <h1>{title}</h1>
    {children}
  </div>
));

//Liu, Yiwei, A0332922J
describe("Categories Component", () => {
  test("should render all category links when categories are provided", () => {
    const mockCategories = [
      { _id: "1", name: "Laptop", slug: "laptop" },
      { _id: "2", name: "Phone", slug: "phone" },
    ];
    useCategory.mockReturnValue(mockCategories);

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Laptop" })).toHaveAttribute("href", "/category/laptop");
  });

  test("should handle null or undefined categories gracefully", () => {
    useCategory.mockReturnValue(undefined);

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    const layout = screen.getByTestId("mock-layout");
    expect(layout).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});