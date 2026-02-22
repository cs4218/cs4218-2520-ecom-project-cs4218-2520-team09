import React from "react";
import { render, screen } from "@testing-library/react";
import About from "./About";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    <div data-testid="layout-title">{title}</div>
    {children}
  </div>
));

describe("About page", () => {
  it("renders layout with correct title and content", () => {
    render(<About />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "About us - Ecommerce app"
    );

    const img = screen.getByAltText("Contact Us");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/about.jpeg");

    expect(screen.getByText("Add text")).toBeInTheDocument();
  });
});


