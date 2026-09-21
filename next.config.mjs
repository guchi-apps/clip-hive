// @ts-check
// 拡張子を .mjs にしているのは、next.config.ts だと本番の `next start` が設定ファイルを
// トランスパイルするためだけに SWC のネイティブバイナリを読み込み、常駐メモリが増えるため。
// TypeScript (.ts) に戻さないこと。型は JSDoc と `// @ts-check` で付けている。
import withPWAInit from "@ducanh2912/next-pwa";

const devAllowedOrigins = (
  process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []
);

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: devAllowedOrigins,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  // next-pwa が (disable 時も) webpack 設定を付与するため、
  // 開発時の Turbopack との併用エラーを抑止する。本番ビルドは --webpack で実行する。
  turbopack: {},
  experimental: {
    // src/proxy.ts (認証チェック) を全ルートに適用しているため、既定の10MB制限のままだと
    // 動画アップロード(/api/videos)がそこで頭打ちになる。動画ファイルを見込んで大きめに確保する。
    proxyClientMaxBodySize: "5gb",
  },
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
