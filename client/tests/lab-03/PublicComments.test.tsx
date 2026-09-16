import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PublicComments from "../../src/components/PublicComments";
import * as apiModule from "../../src/api";

vi.mock("../../src/api", async (importOriginal) => {
  const actual = await importOriginal<typeof apiModule>();
  return {
    ...actual,
    fetchTicketComments: vi.fn(),
    postTicketComment: vi.fn(),
    indicateResolveApi: vi.fn(),
    requestReopenApi: vi.fn(),
  };
});

describe("PublicComments Component & Requester Signalling", () => {
  const mockCurrentUser = {
    id: 1,
    name: "Alice Smith",
    email: "alice@example.com",
    role: "REQUESTER" as const,
    isActive: true,
    requiresPasswordChange: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders public comments list with author name and role badges", async () => {
    vi.mocked(apiModule.fetchTicketComments).mockResolvedValue({
      comments: [
        {
          id: "c-1",
          ticketId: "t-1",
          authorId: 1,
          content: "Hello, I need help with Wi-Fi.",
          createdAt: "2026-09-17T00:00:00.000Z",
          author: { id: 1, name: "Alice Smith", role: "REQUESTER" },
        },
        {
          id: "c-2",
          ticketId: "t-1",
          authorId: 2,
          content: "Investigating the access point now.",
          createdAt: "2026-09-17T00:05:00.000Z",
          author: { id: 2, name: "John Staff", role: "IT_STAFF" },
        },
      ],
    });

    render(<PublicComments ticketId="t-1" currentUser={mockCurrentUser} />);

    await waitFor(() => {
      expect(screen.getByText("Hello, I need help with Wi-Fi.")).toBeInTheDocument();
      expect(screen.getByText("Investigating the access point now.")).toBeInTheDocument();
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("John Staff")).toBeInTheDocument();
      expect(screen.getByText("Requester")).toBeInTheDocument();
      expect(screen.getByText("IT Staff")).toBeInTheDocument();
    });
  });

  it("submits a new public comment and updates the list", async () => {
    vi.mocked(apiModule.fetchTicketComments).mockResolvedValue({ comments: [] });
    vi.mocked(apiModule.postTicketComment).mockResolvedValue({
      id: "c-3",
      ticketId: "t-1",
      authorId: 1,
      content: "Thank you for the update!",
      createdAt: "2026-09-17T00:10:00.000Z",
      author: { id: 1, name: "Alice Smith", role: "REQUESTER" },
    });

    render(<PublicComments ticketId="t-1" currentUser={mockCurrentUser} />);

    await waitFor(() => {
      expect(screen.getByText("No public comments yet.")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Type your public comment here…");
    fireEvent.change(textarea, { target: { value: "Thank you for the update!" } });

    const submitBtn = screen.getByRole("button", { name: "Post Comment" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiModule.postTicketComment).toHaveBeenCalledWith("t-1", "Thank you for the update!");
      expect(screen.getByText("Thank you for the update!")).toBeInTheDocument();
    });
  });
});
