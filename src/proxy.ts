import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy-session";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

// sw.js / workbox-*.js は未ログインでも 200 で返す必要がある。ここを通すとログアウト時に
// /auth/signin へのリダイレクトが HTML で返り、MIME タイプ違いで Service Worker の更新が失敗する。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-icon|sw.js|workbox-|fallback-).*)",
  ],
};
