import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "default",
  className,
}: {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const label = name?.trim() || email?.trim() || "ResourceHive user";
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "RU";
  const optimized = getCloudinaryAvatarSources(avatarUrl);
  const sizes = {
    sm: "24px",
    default: "32px",
    lg: "40px",
  }[size];

  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? (
        <AvatarImage
          src={optimized?.src ?? avatarUrl}
          srcSet={optimized?.srcSet}
          sizes={optimized ? sizes : undefined}
          alt={`${label} profile picture`}
        />
      ) : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

const AVATAR_DELIVERY_WIDTHS = [48, 64, 96, 128, 256] as const;

function getCloudinaryAvatarSources(avatarUrl?: string | null) {
  if (!avatarUrl) return undefined;

  try {
    const url = new URL(avatarUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      !/^\/[^/]+\/image\/upload\/(?:v\d+\/)?avatars\/[\w/-]+\.(?:webp|png|jpe?g)$/i.test(
        url.pathname,
      )
    ) {
      return undefined;
    }

    const path = url.pathname;
    const marker = "/image/upload/";
    const insertion = path.indexOf(marker) + marker.length;
    const makeUrl = (width: number) => {
      const transformation = `c_fill,g_auto,h_${width},w_${width},q_auto,f_auto`;
      return `${url.origin}${path.slice(0, insertion)}${transformation}/${path.slice(insertion)}${url.search}`;
    };

    return {
      src: makeUrl(128),
      srcSet: AVATAR_DELIVERY_WIDTHS.map(
        (width) => `${makeUrl(width)} ${width}w`,
      ).join(", "),
    };
  } catch {
    return undefined;
  }
}
