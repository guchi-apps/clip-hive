import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "clip-hive",
    short_name: "clip-hive",
    description: "動画URL・動画ファイルの一元管理アプリ",
    start_url: "/videos",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c17817",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
