import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import { CollaboratorsPanel } from "../src/features/collaborators/CollaboratorsPanel";
import {
  useCollaborators,
  useCurrentUserId,
  useInviteCollaborator,
  useRemoveCollaborator,
} from "../src/features/collaborators/useCollaborators";

vi.mock("../src/features/collaborators/useCollaborators", () => ({
  useCollaborators: vi.fn(),
  useCurrentUserId: vi.fn(),
  useInviteCollaborator: vi.fn(),
  useRemoveCollaborator: vi.fn(),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

const inviteMutate = vi.fn();
const removeMutate = vi.fn();

function renderPanel(props: Partial<React.ComponentProps<typeof CollaboratorsPanel>> = {}) {
  render(
    <CollaboratorsPanel
      tripId="trip-1"
      ownerId="owner-1"
      open={true}
      onClose={vi.fn()}
      {...props}
    />
  );
}

describe("CollaboratorsPanel", () => {
  beforeEach(() => {
    inviteMutate.mockClear();
    removeMutate.mockClear();
    vi.mocked(useReducedMotion).mockReturnValue(true);
    vi.mocked(useInviteCollaborator).mockReturnValue({
      mutate: inviteMutate,
      isPending: false,
    } as any);
    vi.mocked(useRemoveCollaborator).mockReturnValue({
      mutate: removeMutate,
      isPending: false,
    } as any);
  });

  it("lists collaborators with email and role badge", () => {
    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    vi.mocked(useCollaborators).mockReturnValue({
      data: [
        {
          id: "c1",
          tripId: "trip-1",
          userId: "u2",
          role: "editor",
          user: { email: "friend@example.com", name: "Friend" },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderPanel();
    expect(screen.getByText("Friend")).toBeInTheDocument();
    expect(screen.getByText("friend@example.com")).toBeInTheDocument();
    expect(screen.getByText("editor")).toBeInTheDocument();
  });

  it("shows the invite form only to the owner", () => {
    vi.mocked(useCollaborators).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    const { unmount } = render(
      <CollaboratorsPanel tripId="trip-1" ownerId="owner-1" open={true} onClose={vi.fn()} />
    );
    expect(screen.getByPlaceholderText(/email@example.com/i)).toBeInTheDocument();
    unmount();

    vi.mocked(useCurrentUserId).mockReturnValue("someone-else");
    render(<CollaboratorsPanel tripId="trip-1" ownerId="owner-1" open={true} onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/email@example.com/i)).not.toBeInTheDocument();
  });

  it("submits an invite with email and role", async () => {
    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    vi.mocked(useCollaborators).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/email@example.com/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(inviteMutate).toHaveBeenCalledWith(
        { email: "new@example.com", role: "editor" },
        expect.anything()
      );
    });
  });

  it("surfaces a signup-required error instead of failing silently", async () => {
    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    vi.mocked(useCollaborators).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);
    inviteMutate.mockImplementation((_input, opts) => {
      opts?.onError?.(new Error("No account found with that email. They must sign up first."));
    });

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/email@example.com/i), {
      target: { value: "nouser@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));

    expect(
      await screen.findByText(/must sign up first/i)
    ).toBeInTheDocument();
  });

  it("requires confirmation before removing a collaborator", async () => {
    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    vi.mocked(useCollaborators).mockReturnValue({
      data: [
        {
          id: "c1",
          tripId: "trip-1",
          userId: "u2",
          role: "viewer",
          user: { email: "friend@example.com", name: null },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(removeMutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/remove collaborator\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm remove/i }));
    await waitFor(() => {
      expect(removeMutate).toHaveBeenCalledWith("u2", expect.anything());
    });
  });

  it("shows an honest loading state", () => {
    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    vi.mocked(useCollaborators).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);
    renderPanel();
    expect(screen.getByText(/loading roster/i)).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    vi.mocked(useCurrentUserId).mockReturnValue("owner-1");
    vi.mocked(useCollaborators).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);
    renderPanel({ open: false });
    expect(screen.queryByText(/collaborators/i)).not.toBeInTheDocument();
  });
});
