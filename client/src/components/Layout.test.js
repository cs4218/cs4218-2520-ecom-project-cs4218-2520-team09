import React from "react";
import { render, screen } from "@testing-library/react";
import Layout from "./Layout";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("./Header", () => () => <div data-testid="header">Header</div>);
jest.mock("./Footer", () => () => <div data-testid="footer">Footer</div>);

jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
}));

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

describe("Layout", () => {
  it("renders header, footer, toaster and children", () => {
    render(
      <Layout title="Custom title" description="desc" keywords="k" author="me">
        <div>Child content</div>
      </Layout>
    );

    // basic structure
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();

    // helmet title
    expect(document.title).toBe("Custom title");
  });

  it("uses default props when not provided", () => {
    render(
      <Layout>
        <div>Defaults</div>
      </Layout>
    );

    expect(document.title).toBe("Ecommerce app - shop now");
  });
});


