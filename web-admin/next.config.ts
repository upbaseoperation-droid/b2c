import type { NextConfig } from "next";
import fs from "fs";

const isBuildWhileDevRunning =
  (process.argv.includes("build") || process.env.NODE_ENV === "production") &&
  fs.existsSync(".next/dev/lock");

const nextConfig: NextConfig = {
  ...(isBuildWhileDevRunning ? { distDir: ".next-build" } : {}),
};

export default nextConfig;

