import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { requestPasswordReset, resetPassword } from "@/lib/auth-api";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-api")>();

  return {
    ...actual,
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  };
});

const requestPasswordResetMock = vi.mocked(requestPasswordReset);
const resetPasswordMock = vi.mocked(resetPassword);

describe("password reset forms", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    requestPasswordResetMock.mockReset().mockResolvedValue({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
    resetPasswordMock.mockReset().mockResolvedValue({
      message: "Password reset successfully.",
    });
  });

  it("requests a reset without revealing whether the account exists", async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText(/Institutional email/), {
      target: { value: "alex@example.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({
        email: "alex@example.edu",
      });
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "If an account exists",
    );
  });

  it("submits matching passwords and returns to login", async () => {
    render(<ResetPasswordForm token="valid-reset-token-value" />);

    fireEvent.change(screen.getByLabelText(/New password/), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith({
        token: "valid-reset-token-value",
        password: "NewPassword123!",
      });
      expect(navigation.replace).toHaveBeenCalledWith(
        "/login?passwordReset=success",
      );
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });

  it("rejects mismatched passwords before calling the service", async () => {
    render(<ResetPasswordForm token="valid-reset-token-value" />);

    fireEvent.change(screen.getByLabelText(/New password/), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), {
      target: { value: "DifferentPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Passwords do not match.")).toBeDefined();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("does not submit when the reset token is missing", () => {
    render(<ResetPasswordForm token="" />);

    expect(screen.getByText("This password reset link is invalid.")).toBeDefined();
    expect(
      (screen.getByRole("button", {
        name: "Reset password",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
