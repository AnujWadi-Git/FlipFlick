import type { NextConfig } from "next";
import path from "path";

// Set STATIC_EXPORT=true only for the /flipflick subpath build that gets
// dropped into the anujwadi.com static site — normal `next dev`/`next build`
// stay a regular Next.js app.
const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  devIndicators: false,
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath: "/flipflick",
        assetPrefix: "/flipflick/",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
