import { NextResponse, type NextRequest } from "next/server";

import { isAllowedEmail } from "@/lib/allowed-users";
import { db } from "@/lib/db";
import { getRequestOrigin, safeNextPath } from "@/lib/request-origin";
import { notifySignalyLogin } from "@/lib/signaly";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[clip-hive] セッションの取得に失敗:", error?.message ?? "ユーザーが返らなかった");
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
  }

  const { user } = data;
  const email = user.email ?? null;

  // Supabase プロジェクトを他アプリと共用しているため、Supabase でログインできることと
  // clip-hive を使ってよいことは別に判定する。許可外のアカウントは clip-hive 側のユーザーを
  // 作らず、Supabase のセッションも破棄する。
  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/signin?error=not_allowed`);
  }

  const metadata = user.user_metadata as Record<string, unknown>;
  const name = (metadata.full_name as string) ?? (metadata.name as string) ?? null;
  const image = (metadata.avatar_url as string) ?? null;

  await linkSupabaseUser({ supabaseUserId: user.id, email: email!, name, image });

  // 接続元IP・User-Agent は notifySignalyLogin がリクエストヘッダーから拾う
  await notifySignalyLogin({
    email,
    name,
    provider: user.app_metadata?.provider ?? null,
  });

  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Supabase のユーザーと clip-hive の User レコードを対応づける。
 *
 * User.id は Video・Tag の外部キーに使われているため差し替えられない。Supabase 移行前から
 * 存在するユーザーは supabaseUserId が NULL のままなので、初回ログイン時にメールアドレスで
 * 見つけて紐付ける（＝既存の動画・タグがそのまま引き継がれる）。
 */
async function linkSupabaseUser(params: {
  supabaseUserId: string;
  email: string;
  name: string | null;
  image: string | null;
}): Promise<void> {
  const { supabaseUserId, email, name, image } = params;

  const linked = await db.user.findUnique({ where: { supabaseUserId } });
  if (linked) {
    await db.user.update({ where: { id: linked.id }, data: { email, name, image } });
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { supabaseUserId, name, image } });
    return;
  }

  await db.user.create({ data: { supabaseUserId, email, name, image } });
}
