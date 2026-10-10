import { headers } from "next/headers";

import { decideAccess } from "@/lib/access/client";
import { SUPABASE_USER_ID_HEADER } from "@/lib/auth-header";
import { db } from "@/lib/db";

export type CurrentUser = {
  /** clip-hive 内部のユーザーID（Video・Tag の外部キー）。 */
  id: string;
  /** Supabase Auth 側のユーザーID。他アプリと共通の値。 */
  supabaseUserId: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * ログイン中のユーザーを返す。
 *
 * Supabase のセッション検証は proxy.ts が済ませ、結果をヘッダーで渡してくる。ここで
 * auth.getUser() を呼び直すと、1 リクエストにつき Supabase への往復が 2 回入ってしまう。
 * proxy.ts の matcher が外れているパス（静的アセット等）からは呼べないことに注意する。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabaseUserId = (await headers()).get(SUPABASE_USER_ID_HEADER);
  if (!supabaseUserId) return null;

  const user = await db.user.findUnique({
    where: { supabaseUserId },
    select: { id: true, supabaseUserId: true, email: true, name: true, image: true },
  });
  if (!user?.supabaseUserId) return null;

  // proxy.ts が同じ主体を判定済みで、結果は ttl の間キャッシュされる。proxy の matcher が外れた経路への備え。
  // DB の行はメール確認済みのログイン（/auth/callback）でしか作られないため emailVerified は true。
  const decision = await decideAccess({ sub: supabaseUserId, email: user.email, emailVerified: true });
  if (!decision.allowed) return null;

  return { ...user, supabaseUserId: user.supabaseUserId };
}

/** clip-hive 内部のユーザーIDを返す。未ログインなら null。 */
export async function requireUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
