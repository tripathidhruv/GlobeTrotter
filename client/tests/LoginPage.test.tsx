import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../src/features/auth/LoginPage";

const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
vi.mock("../src/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: (args: any) => signInWithPassword(args) } },
}));

describe("LoginPage", () => {
  it("submits email/password to Supabase", async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter22" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@test.com", password: "hunter22" });
    });
  });
});
