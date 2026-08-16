import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../../src/App";
import * as api from "../../src/api";

describe("UI-03: Error Handling State Rendering", () => {
  it("displays System Status Offline and error message on API failure", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValueOnce({
      online: false,
      error: "Unable to connect to TokTickIT API",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Check System/i }));

    await waitFor(() => {
      expect(screen.getByText(/System Status: Offline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
