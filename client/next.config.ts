import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const directory = path.dirname(fileURLToPath(import.meta.url));
const apiUrl = (process.env.API_URL ?? "http://localhost:4311").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  sassOptions: {},
  output: "standalone", // Generates a standalone server folder during build
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.join(directory, ".."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
