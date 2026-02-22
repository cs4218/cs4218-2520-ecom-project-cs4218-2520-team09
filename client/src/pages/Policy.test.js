// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Policy from "./Policy";

jest.mock("./../components/Layout", () => {
  return ({ children }) => <div>{children}</div>;
});

// Liu, Yiwei, A0332922J
describe("Policy Component", () => {
  test("should render the privacy policy content and layout correctly", () => {
    render(<Policy />);

    const titleElement = screen.getByText("Privacy Policy");
    expect(titleElement).toBeInTheDocument();

    const imageElement = screen.getByAltText("privacy policy");
    expect(imageElement).toBeInTheDocument();
    expect(imageElement).toHaveAttribute("src", "/images/policy.jpeg");
    expect(imageElement).toHaveStyle({ width: "100%" });

    expect(screen.getByText("We value your privacy and are committed to protecting your personal data.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
  });

  test("should have the correct container class for styling", () => {
    render(<Policy />);
    const container = screen.getByAltText("privacy policy").closest('.row');
    expect(container).toHaveClass("policy-container");
  });
});