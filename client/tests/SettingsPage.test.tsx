import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { SettingsPage } from "../src/features/settings/SettingsPage";
import { useProfile, useUpdateProfile, useDeleteAccount } from "../src/features/settings/useProfile";
import { useTrips } from "../src/features/trips/useTrips";

vi.mock("../src/features/settings/useProfile", () => ({
  useProfile: vi.fn(),
  useUpdateProfile: vi.fn(),
  useDeleteAccount: vi.fn(),
}));

vi.mock("../src/features/trips/useTrips", () => ({
  useTrips: vi.fn(),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

const signOut = vi.fn().mockResolvedValue({});
vi.mock("../src/lib/supabase", () => ({
  supabase: { auth: { signOut: () => signOut() } },
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

const updateMutate = vi.fn();
const deleteMutate = vi.fn();

function renderPage() {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

const baseProfile = {
  id: "u1",
  email: "traveler@example.com",
  name: "Ada Lovelace",
  avatarUrl: null,
  role: "user" as const,
  languagePref: "en",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("SettingsPage", () => {
  beforeEach(() => {
    updateMutate.mockClear();
    deleteMutate.mockClear();
    signOut.mockClear();
    navigate.mockClear();
    vi.mocked(useReducedMotion).mockReturnValue(false);
    vi.mocked(useUpdateProfile).mockReturnValue({ mutate: updateMutate, isPending: false } as any);
    vi.mocked(useDeleteAccount).mockReturnValue({ mutate: deleteMutate, isPending: false } as any);
    vi.mocked(useTrips).mockReturnValue({ data: [] } as any);
    vi.mocked(useProfile).mockReturnValue({
      data: baseProfile,
      isLoading: false,
      isError: false,
    } as any);
  });

  it("renders the profile with a read-only email field explaining why", () => {
    renderPage();
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email.value).toBe("traveler@example.com");
    expect(email).toBeDisabled();
    expect(screen.getByText(/managed by your sign-in provider/i)).toBeInTheDocument();
  });

  it("shows an honest loading state", () => {
    vi.mocked(useProfile).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any);
    renderPage();
    expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
  });

  it("shows an honest error state", () => {
    vi.mocked(useProfile).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderPage();
    expect(screen.getByText(/couldn't load your profile/i)).toBeInTheDocument();
  });

  it("saves name, avatar URL, and language preference", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Grace Hopper" } });
    fireEvent.change(screen.getByLabelText("Avatar URL"), {
      target: { value: "https://example.com/me.jpg" },
    });
    fireEvent.change(screen.getByLabelText("Language preference"), { target: { value: "fr" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith(
        {
          name: "Grace Hopper",
          avatarUrl: "https://example.com/me.jpg",
          languagePref: "fr",
        },
        expect.anything()
      );
    });
  });

  it("surfaces save success visibly", async () => {
    updateMutate.mockImplementation((_input, opts) => opts.onSuccess());
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText(/^saved\.$/i)).toBeInTheDocument();
  });

  it("shows destinations derived from trips, honestly labeled", () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "t1",
          stops: [{ city: { name: "Kyoto", country: "Japan" } }],
        },
      ],
    } as any);
    renderPage();
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText(/not a separate saved-destinations list/i)).toBeInTheDocument();
  });

  it("requires a typed confirmation phrase before deleting the account", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));
    expect(deleteMutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/type "delete my account" exactly/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/type delete my account to confirm/i), {
      target: { value: "DELETE MY ACCOUNT" },
    });
    fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalled());
  });

  it("signs out and redirects to login after a successful account deletion", async () => {
    deleteMutate.mockImplementation((_input, opts) => opts.onSuccess());
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
    fireEvent.change(await screen.findByLabelText(/type delete my account to confirm/i), {
      target: { value: "DELETE MY ACCOUNT" },
    });
    fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login", { replace: true }));
  });
});
