import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { AuthProvider, useAuth } from "./auth";

jest.mock("axios", () => ({
  defaults: { headers: { common: {} } },
}));

import axios from "axios";

function Consumer() {
  const [auth] = useAuth();
  return (
    <div>
      <div data-testid="token">{auth?.token ?? ""}</div>
      <div data-testid="user">{auth?.user?.email ?? ""}</div>
    </div>
  );
}

describe("AuthContext (client/src/context/auth.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("provides default auth state when localStorage has no auth", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // initial state
    expect(screen.getByTestId("token")).toHaveTextContent("");
    expect(screen.getByTestId("user")).toHaveTextContent("");

    // axios default header is set from token on render
    expect(axios.defaults.headers.common.Authorization).toBe("");

    // effect runs, but state should remain default
    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("");
    });
  });

  it("hydrates auth state from localStorage and sets axios Authorization header", async () => {
    window.localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { email: "a@b.com" },
        token: "t123",
      })
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("t123");
      expect(screen.getByTestId("user")).toHaveTextContent("a@b.com");
    });

    expect(axios.defaults.headers.common.Authorization).toBe("t123");
  });
});


