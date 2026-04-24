import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-gfm", "remark-parse", "unified"],
};

export default nextConfig;
