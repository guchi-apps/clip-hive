// Node の HTTP サーバーに requestTimeout を設定するプリロード（`node --require` で読み込む）。
//
// Node 18以降、`http.Server` の requestTimeout は既定で5分。リクエスト開始からボディを
// 受け取り終えるまでの上限なので、30分尺の動画のような数GBのアップロードは転送だけで
// 5分を超え、転送の途中で接続が切られてアップロードが失敗する（guchi-apps/clip-hive#5）。
//
// Next.js 側にこれを設定する手段が無い。`next start` が受け付けるタイムアウト系のオプションは
// `--keepAliveTimeout` だけで、next.config にも項目が無く、生成された `http.Server` インスタンスも
// 外へ公開されない（`next/dist/server/lib/start-server.js` が `http.createServer()` の戻り値を
// そのまま使っている）。カスタムサーバー（server.js）へ置き換えれば設定できるが、`next start` が
// 行う初期化を自前で再現することになり、middleware（src/proxy.ts）まわりまで影響が及ぶ。
//
// そこでサーバーの生成だけを包み、`http.createServer()` に requestTimeout を渡す。
// **生成後に `server.requestTimeout = ...` と代入しても効かない**（値は読めるが、期限切れ判定に
// 使われるのは生成時に渡した値。実測で確認済み）ため、必ずオプションとして渡すこと。
// ヘッダ受信の上限（headersTimeout、既定60秒）はヘッダだけが対象で大容量アップロードとは
// 無関係なため、既定のままにする。
const http = require("node:http");

// 30分。上流の Apache 側にも ProxyTimeout があるため、実際の上限は小さい方で決まる。
const DEFAULT_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

function resolveRequestTimeoutMs() {
  const raw = process.env.HTTP_REQUEST_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === "") return DEFAULT_REQUEST_TIMEOUT_MS;

  // 0 は「上限なし」を意味する Node の仕様に合わせ、そのまま通す。
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.warn(
      `[http-timeouts] HTTP_REQUEST_TIMEOUT_MS の値が不正なため既定値(${DEFAULT_REQUEST_TIMEOUT_MS}ms)を使います: ${raw}`
    );
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return parsed;
}

const requestTimeout = resolveRequestTimeoutMs();
const originalCreateServer = http.createServer;

// http.createServer([options][, requestListener])
http.createServer = function createServer(...args) {
  if (typeof args[0] === "object" && args[0] !== null) {
    // 呼び出し側が明示的に指定しているならそちらを尊重する。
    args[0] = { requestTimeout, ...args[0] };
  } else {
    args.unshift({ requestTimeout });
  }
  return originalCreateServer.apply(this, args);
};
