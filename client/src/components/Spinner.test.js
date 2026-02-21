import React from "react";
import { render, screen, act } from "@testing-library/react";
import Spinner from "./Spinner";

// Written by Wu Jinhan
// Student No: A0266075Y

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({ pathname: "/current" })),
}));

import { useNavigate } from "react-router-dom";

describe("Spinner", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders countdown message and spinner", () => {
    render(<Spinner path="login" />);

    expect(
      screen.getByText(/redirecting to you in 3 second/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("uses default path 'login' when path prop is not provided", () => {
    const navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);

    render(<Spinner />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(navigateMock).toHaveBeenCalledWith("/login", { state: "/current" });
  });

  it("navigates to custom path when path prop is provided", () => {
    const navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);

    render(<Spinner path="dashboard" />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(navigateMock).toHaveBeenCalledWith("/dashboard", { state: "/current" });
  });

  it("decrements count every second and navigates when count reaches 0", () => {
    const navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);

    render(<Spinner path="login" />);

    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/redirecting to you in 2 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/redirecting to you in 1 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(navigateMock).toHaveBeenCalledWith("/login", { state: "/current" });
  });
});
