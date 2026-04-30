import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker(本番)で使用する standalone 出力。
  // .next/standalone/ に server.js とランタイム依存だけがコピーされる。
  output: "standalone",
};

export default nextConfig;
