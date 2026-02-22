import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

// Written by Wu Jinhan
// Student No: A0266075Y

describe("Footer", () => {
  it("renders rights text and navigation links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(
      screen.getByText("All Rights Reserved © TestingComp")
    ).toBeInTheDocument();

    expect(screen.getByText("About").closest("a")).toHaveAttribute(
      "href",
      "/about"
    );
    expect(screen.getByText("Contact").closest("a")).toHaveAttribute(
      "href",
      "/contact"
    );
    expect(screen.getByText("Privacy Policy").closest("a")).toHaveAttribute(
      "href",
      "/policy"
    );
  });
});


