import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const devAllowedOrigins = (
  process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []
);

const nextConfig: NextConfig = {
  allowedDevOrigins: devAllowedOrigins,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  // next-pwa が (disable 時も) webpack 設定を付与するため、
  // 開発時の Turbopack との併用エラーを抑止する。本番ビルドは --webpack で実行する。
  turbopack: {},
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // 一覧・検索をオフラインでも表示できるよう、動画一覧・タグ一覧 API を
        // ネットワーク優先でキャッシュする(動画ファイル自体はキャッシュ対象外)。
        urlPattern: /\/api\/(videos|tags)(\?.*)?$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "clip-hive-api-cache",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);
