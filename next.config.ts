import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["chromadb", "@chroma-core/default-embed"],
  /* config options here */
};

export default nextConfig;
