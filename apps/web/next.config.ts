import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent an unrelated lockfile above the monorepo from becoming the
    // workspace root and leaving newly added nested App Router routes stale.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
