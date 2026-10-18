/**
 * ログインしていなくても開けるパス。
 *
 * `/api/app-version` はデプロイのヘルスチェック（VPS上で 127.0.0.1 から curl）が未ログインで
 * 叩くため公開する（#207）。返すのはバージョンとコミット SHA だけで、利用者のデータは含まない。
 */
export const publicPaths = [
  "/",
  "/auth/signin",
  "/auth/google",
  "/auth/callback",
  "/auth/signout",
  "/api/app-version",
];

export function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
