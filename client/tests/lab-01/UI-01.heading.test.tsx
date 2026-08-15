import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../../src/App";

describe("UI-01: Heading and Action Button Rendering", () => {
  it("renders TokTickIT heading and Check System button", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Check System/i })).toBeInTheDocument();
  });
});
