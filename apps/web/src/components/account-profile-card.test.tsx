import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountProfileCard } from "@/components/account-profile-card";
import type { CurrentUserResponse } from "@/lib/auth-api";
import { removeAvatar, uploadAvatar } from "@/lib/auth-api";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/lib/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-api")>();

  return {
    ...actual,
    uploadAvatar: vi.fn(),
    removeAvatar: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const uploadAvatarMock = vi.mocked(uploadAvatar);
const removeAvatarMock = vi.mocked(removeAvatar);
const toastSuccessMock = vi.mocked(toast.success);
const toastErrorMock = vi.mocked(toast.error);

const mockUser: CurrentUserResponse["user"] = {
  id: "user-1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  displayName: "Test User",
  emailVerified: true,
  status: "ACTIVE",
  platformRole: "USER",
  createdAt: "2026-07-01T00:00:00.000Z",
  avatarUrl: undefined,
  authenticationMethods: {
    password: true,
    google: {
      enabled: false,
      connected: false,
      email: null,
      connectedAt: null,
    },
  },
};

describe("AccountProfileCard", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    uploadAvatarMock.mockReset();
    removeAvatarMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("displays initials when there is no avatar", () => {
    render(<AccountProfileCard user={mockUser} />);
    expect(screen.getByText("TU")).toBeDefined();
    expect(screen.getByDisplayValue("Test")).toBeDefined();
    expect(screen.getByDisplayValue("User")).toBeDefined();
    expect(screen.getByDisplayValue("test@example.com")).toBeDefined();
  });

  it("handles avatar upload successfully", async () => {
    uploadAvatarMock.mockResolvedValueOnce({ avatarUrl: "https://example.com/avatar.jpg" });
    
    render(<AccountProfileCard user={mockUser} />);
    
    // The file input is linked to the "Upload" menu item label
    const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadAvatarMock).toHaveBeenCalledWith(file);
      expect(toastSuccessMock).toHaveBeenCalledWith("Profile picture updated successfully.");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });

  it("handles avatar removal successfully", async () => {
    removeAvatarMock.mockResolvedValueOnce(undefined);
    
    const userWithAvatar = { ...mockUser, avatarUrl: "https://example.com/avatar.jpg" };
    render(<AccountProfileCard user={userWithAvatar} />);
    
    // Open dropdown
    fireEvent.click(screen.getByLabelText("Manage profile picture"));
    
    // Click remove
    const removeButton = await screen.findByText("Remove");
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(removeAvatarMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Profile picture removed successfully.");
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });

  it("shows error toast when upload fails", async () => {
    uploadAvatarMock.mockRejectedValueOnce(new Error("Upload failed"));
    
    render(<AccountProfileCard user={mockUser} />);
    
    const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Upload failed");
    });
  });
});
