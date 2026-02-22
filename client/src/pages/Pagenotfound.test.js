import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Pagenotfound from "./Pagenotfound";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    <div data-testid="layout-title">{title}</div>
    {children}
  </div>
));

describe("Pagenotfound page", () => {
  it("renders 404 layout and go back link", () => {
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "go back- page not found"
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();

    const link = screen.getByText("Go Back").closest("a");
    expect(link).toHaveAttribute("href", "/");
  });
});


