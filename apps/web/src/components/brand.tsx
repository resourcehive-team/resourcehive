import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({
  className,
  href = "/dashboard",
  label = "ResourceHive dashboard",
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  href?: string;
  label?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex w-fit items-center gap-3", className)}
      aria-label={label}
    >
      <Image
        src="/resourcehive-mark.svg"
        alt=""
        width={32}
        height={32}
        className={cn("size-8 shrink-0", markClassName)}
      />
      <span
        className={cn(
          "font-serif text-2xl leading-none tracking-[-0.035em] text-ink",
          wordmarkClassName,
        )}
      >
        ResourceHive
      </span>
    </Link>
  );
}
