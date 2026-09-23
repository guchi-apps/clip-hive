/** PIN未検証の /api/* リクエストへ返す 403 JSON の `code`。フロントはこれを見てPIN入力画面へ送る。 */
export const PIN_REQUIRED_CODE = "PIN_REQUIRED";

/**
 * fetch の応答がPIN未検証（有効期限切れ含む）によるものなら、PIN入力画面へ遷移して true を返す。
 * 通常のエラー表示へ進ませないための呼び出し側の判定に使う。
 */
export async function redirectIfPinRequired(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  const data = await res
    .clone()
    .json()
    .catch(() => null);
  if (data?.code !== PIN_REQUIRED_CODE) return false;
  const callbackUrl = window.location.pathname + window.location.search;
  window.location.assign(`/auth/pin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return true;
}
