import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker(本番)で使用する standalone 出力。
  // .next/standalone/ に server.js とランタイム依存だけがコピーされる。
  output: "standalone",
  // Server Action のリクエストボディ上限を引き上げる (デフォルトは 1MB)。
  // 主にレイアウト背景画像 / シャッフル結果 PNG など、数MB の画像送信に必要。
  // 大きいファイルは API ルート (/api/...) を優先しているが、保険として広めに設定。
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
