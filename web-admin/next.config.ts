import type { NextConfig } from "next";
import fs from "fs";

const isBuildWhileDevRunning =
  (process.argv.includes("build") || process.env.NODE_ENV === "production") &&
  fs.existsSync(".next/dev/lock");

const customDistDir = process.env.NEXT_DIST_DIR || (isBuildWhileDevRunning ? ".next-build" : undefined);

const nextConfig: NextConfig = {
  ...(customDistDir ? { distDir: customDistDir } : {}),
};

export default nextConfig;
