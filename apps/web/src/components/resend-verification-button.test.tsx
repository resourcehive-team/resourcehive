import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResendVerificationButton } from "@/components/resend-verification-button";
import { resendVerificationEmail } from "@/lib/auth-api";

vi.mock("@/lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-api")>();

  return {
    ...actual,
    resendVerificationEmail: vi.fn(),
  };
});

const resendVerificationEmailMock = vi.mocked(resendVerificationEmail);

describe("ResendVerificationButton", () => {
  beforeEach(() => {
    resendVerificationEmailMock.mockReset().mockResolvedValue({
      message:
        "If an unverified account exists for that email, a verification link has been sent.",
    });
  });

  it("requests another link for the pending email", async () => {
    render(<ResendVerificationButton email="alex@example.edu" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Resend verification link" }),
    );

    await waitFor(() => {
      expect(resendVerificationEmailMock).toHaveBeenCalledWith(
        "alex@example.edu",
      );
    });
    expect(
      await screen.findByText(/If an unverified account exists/),
    ).toBeDefined();
    expect(
      (
        screen.getByRole("button", {
          name: "Verification link requested",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("remains unavailable when no pending email is known", () => {
    render(<ResendVerificationButton email={null} />);

    expect(
      (
        screen.getByRole("button", {
          name: "Resend verification link",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(resendVerificationEmailMock).not.toHaveBeenCalled();
  });
});
