import React from "react";
import { render, screen } from "@testing-library/react";
import Spinner from "./Spinner";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({ pathname: "/current" })),
}));

import { useNavigate } from "react-router-dom";

describe("Spinner", () => {
  it("renders countdown message and spinner", () => {
    render(<Spinner path="login" />);

    expect(
      screen.getByText(/redirecting to you in 3 second/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
