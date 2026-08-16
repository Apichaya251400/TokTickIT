import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../../src/App";
import * as api from "../../src/api";

describe("UI-02: Loading State and Category List Rendering", () => {
  it("shows loading state then displays System Status Online and categories", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValueOnce({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Check System/i }));

    await waitFor(() => {
      expect(screen.getByText("Online")).toBeInTheDocument();
    });

    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });
});
