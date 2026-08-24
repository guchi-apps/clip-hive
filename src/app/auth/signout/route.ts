import { NextResponse, type NextRequest } from "next/server";

import { PIN_COOKIE_NAME } from "@/lib/pin-cookie";
import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * ログアウトする。
 *
 * ログイン（/auth/google）と同じく、クライアント JS のハイドレーション前でも押せる必要が
 * あるためフォームの POST で受ける。GET にしないのは、ブラウザやリンクの先読みで意図せず
 * ログアウトさせられることを避けるため。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[clip-hive] ログアウトに失敗:", error.message);
  }

  // POST のリダイレクトは 303 で返す。既定の 307 のままだとリダイレクト先へも POST される。
  const response = NextResponse.redirect(new URL("/", getRequestOrigin(request)), 303);
  // PIN の検証済みCookieも一緒に落とす。残しておくと、別アカウントでログインし直した際に
  // 前のユーザーの検証結果が残り続ける（署名にユーザーIDを含むため通りはしないが、無駄に残る）。
  response.cookies.delete(PIN_COOKIE_NAME);
  return response;
}
