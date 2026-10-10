/**
 * サーバーが起動したときに1回だけ走る（Next.js の instrumentation）。
 *
 * StatusHub の共通アクセス設定へ、利用者の操作が無くても5分以内に1回は確認を送り、適用中の版を伝える
 * （管理画面の「反映済み」の根拠になる）。時刻が来たことに気付けるのはサーバーだけなので、
 * リクエストの外に置き場所が要る。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { sendAccessHeartbeat } = await import("@/lib/access/client");
  void sendAccessHeartbeat();
  setInterval(() => void sendAccessHeartbeat(), 4 * 60 * 1000).unref();
}
