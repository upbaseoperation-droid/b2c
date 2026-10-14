import type { NextConfig } from "next";
import fs from "fs";

const isBuildWhileDevRunning =
  process.argv.includes("build") && fs.existsSync(".next/dev/lock");

const nextConfig: NextConfig = {
  ...(isBuildWhileDevRunning ? { distDir: ".next-build" } : {}),
};

export default nextConfig;

