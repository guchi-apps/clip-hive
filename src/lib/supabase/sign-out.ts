/** signOut を呼べる最小限の形。Supabase クライアントの実体に依存せず、テストで差し替えられるようにする。 */
type SignOutClient = {
  auth: {
    signOut: (options: { scope: "local" }) => Promise<{ error: { message: string } | null }>;
  };
};

/**
 * このアプリのセッションだけを破棄する。
 *
 * Supabase プロジェクトを他アプリと共用しているため、scope を省略した signOut() は既定の
 * `global` として動き、同じユーザーの他アプリ・他端末の refresh token まで失効させてしまう。
 * ログアウトと、許可外ユーザーのセッション破棄はどちらもこの関数を通し、`local` を固定する。
 */
export function signOutLocal(supabase: SignOutClient) {
  return supabase.auth.signOut({ scope: "local" });
}
