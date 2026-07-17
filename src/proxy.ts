import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { applyAuthUrlFromRequest } from "@/lib/auth-url";
import { PIN_COOKIE_NAME, PIN_MAX_AGE_MS, pinCookieOptions, signPinCookie, verifyPinCookie } from "@/lib/pin-cookie";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/", "/auth/signin", "/auth/error"];
const PIN_PATH = "/auth/pin";

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default auth(async (req) => {
  applyAuthUrlFromRequest(req.url, req.headers.get("host"), req.headers.get("x-forwarded-proto"));

  const { pathname } = req.nextUrl;

  // /api/* はルートハンドラ自身が requireUserId() で認証チェックし、
  // 401 JSON を返す設計のため、proxy ではリダイレクトせず素通りさせる。
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if (req.auth?.user?.id && pathname === "/auth/signin") {
      return NextResponse.redirect(new URL("/videos", req.url));
    }
    return NextResponse.next();
  }

  const userId = req.auth?.user?.id;
  if (!userId) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // PWA起動時の簡易PIN認証(issue #8): Googleセッションが有効でも、
  // 一定時間操作がなければ再度PINの入力を求める。
  const pinCookie = req.cookies.get(PIN_COOKIE_NAME)?.value;
  const pinVerified = !!pinCookie && (await verifyPinCookie(pinCookie, userId, PIN_MAX_AGE_MS));

  if (pathname === PIN_PATH) {
    if (pinVerified) {
      return NextResponse.redirect(new URL("/videos", req.url));
    }
    return NextResponse.next();
  }

  if (!pinVerified) {
    const pinUrl = new URL(PIN_PATH, req.url);
    pinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(pinUrl);
  }

  // アクセスが続く限り有効期限をスライドさせる。
  const res = NextResponse.next();
  res.cookies.set(PIN_COOKIE_NAME, await signPinCookie(userId), pinCookieOptions);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-icon).*)",
  ],
};
