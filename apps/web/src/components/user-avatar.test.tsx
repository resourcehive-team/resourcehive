import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserAvatar } from "@/components/user-avatar";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarImage: (props: React.ComponentProps<"img">) => (
    <span
      role="img"
      aria-label={props.alt}
      data-src={props.src}
      data-srcset={props.srcSet}
      data-sizes={props.sizes}
    />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("UserAvatar", () => {
  it("uses a small fixed Cloudinary delivery set for stored avatars", () => {
    render(
      <UserAvatar
        name="Alice Perera"
        avatarUrl="https://res.cloudinary.com/demo/image/upload/v123/avatars/user-1.webp"
      />,
    );

    const image = screen.getByRole("img", {
      name: "Alice Perera profile picture",
    });
    expect(image.getAttribute("data-src")).toContain("h_128,w_128");
    expect(image.getAttribute("data-srcset")).toContain("h_48,w_48");
    expect(image.getAttribute("data-srcset")).toContain("h_256,w_256");
    expect(image.getAttribute("data-sizes")).toBe("32px");
  });

  it("preserves non-Cloudinary image URLs and falls back to initials on error", () => {
    render(
      <UserAvatar
        name="Alice Perera"
        avatarUrl="https://images.example.test/alice.png"
      />,
    );

    const image = screen.getByRole("img", {
      name: "Alice Perera profile picture",
    });
    expect(image.getAttribute("data-src")).toBe(
      "https://images.example.test/alice.png",
    );
    expect(image.getAttribute("data-srcset")).toBeNull();
    expect(screen.getByText("AP")).toBeTruthy();
  });
});
