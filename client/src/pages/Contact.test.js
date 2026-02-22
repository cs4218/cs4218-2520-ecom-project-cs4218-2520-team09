import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Contact from "./Contact";

jest.mock("./../components/Layout", () => (props) => (
  <div data-testid="mock-layout">
    <span data-testid="mock-title">{props.title}</span>
    {props.children}
  </div>
));

jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span data-testid="mail-icon" />,
  BiPhoneCall: () => <span data-testid="phone-icon" />,
  BiSupport: () => <span data-testid="support-icon" />,
}));

//Liu, Yiwei, A0332922J
describe("Contact Component Tests", () => {
  test("should render the Layout and pass the correct title", () => {
    // Given
    render(<Contact />);
    
    // When
    const titleElement = screen.getByTestId("mock-title");
    
    // Then
    expect(titleElement).toHaveTextContent("Contact us");
  });

  test("should render the contact image with correct attributes", () => {
    // Given
    render(<Contact />);
    
    // When
    const image = screen.getByRole("img");
    
    // Then
    expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
    expect(image).toHaveAttribute("alt", "Contact Us");
  });

  test("should display the updated description text", () => {
    // Given
    render(<Contact />);
    
    // When
    const description = screen.getByText(/queries or info about products/i);
    
    // Then
    expect(description).toBeInTheDocument();
  });

  test("should display the corrected email without www prefix", () => {
    // Given
    render(<Contact />);
    
    // When
    const email = screen.getByText(/help@ecommerceapp.com/i);
    
    // Then
    expect(email).toBeInTheDocument();
    expect(email.textContent).not.toMatch(/www\./);
  });

  test("should render all contact icons and phone numbers", () => {
    // Given
    render(<Contact />);
    
    // When
    const mailIcon = screen.getByTestId("mail-icon");
    const phoneIcon = screen.getByTestId("phone-icon");
    const supportIcon = screen.getByTestId("support-icon");
    
    // Then
    expect(mailIcon).toBeInTheDocument();
    expect(phoneIcon).toBeInTheDocument();
    expect(supportIcon).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
  });
});