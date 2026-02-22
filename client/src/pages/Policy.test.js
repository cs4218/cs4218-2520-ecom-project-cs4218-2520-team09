// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Policy from "./Policy";

jest.mock("./../components/Layout", () => {
  return ({ children, title }) => (
    <div data-testid="mock-layout" data-title={title}>
      {children}
    </div>
  );
});
// Liu, Yiwei, A0332922J
describe("Policy Component", () => {
  test("should render the privacy policy content and layout correctly", () => {

    render(<Policy />);

    const layoutElement = screen.getByTestId("mock-layout");
    expect(layoutElement).toHaveAttribute("data-title", "Privacy Policy");

    const imageElement = screen.getByAltText("contactus");
    expect(imageElement).toBeInTheDocument();
    expect(imageElement).toHaveAttribute("src", "/images/contactus.jpeg");
    expect(imageElement).toHaveStyle({ width: "100%" });

    const textElements = screen.getAllByText("add privacy policy");
    expect(textElements.length).toBe(7);
  });
});