import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root (one level up) also has a package-lock.json for the NestJS
  // backend; pin Turbopack's root to this app so it doesn't guess wrong.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
