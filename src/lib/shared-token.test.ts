import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { getSharedToken, resetSharedTokenCache, resolveSharedToken } from "./shared-token.ts";

const realFetch = globalThis.fetch;
const KEYS = ["ISSUE_DECK_URL", "SHARED_TOKEN_API_SECRET", "TEST_FALLBACK_TOKEN"] as const;
const saved: Record<string, string | undefined> = {};

let calls: { url: string; headers: Headers }[] = [];

function stub(respond: () => Response | Promise<Response>) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers) });
    return respond();
  }) as typeof fetch;
}
const ok = (value: string) => new Response(JSON.stringify({ name: "X", value }), { status: 200 });

beforeEach(() => {
  for (const key of KEYS) saved[key] = process.env[key];
  process.env.ISSUE_DECK_URL = "https://deck.test/";
  process.env.SHARED_TOKEN_API_SECRET = "bearer-secret";
  delete process.env.TEST_FALLBACK_TOKEN;
  calls = [];
  resetSharedTokenCache();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test("取得できたら値を返し、利用元とBearerを付けて呼ぶ", async () => {
  stub(() => ok("v1"));
  const result = await resolveSharedToken("MY_TOKEN", null, { now: 1000 });
  assert.equal(result.value, "v1");
  assert.deepEqual(result.cache, { value: "v1", fetchedAtMs: 1000 });
  assert.equal(calls[0].url, "https://deck.test/api/shared-tokens?name=MY_TOKEN");
  assert.equal(calls[0].headers.get("authorization"), "Bearer bearer-secret");
  assert.equal(calls[0].headers.get("x-shared-token-consumer"), "clip-hive");
});

test("キャッシュが新しい間は取りにいかず、古くなれば取り直す", async () => {
  stub(() => ok("v2"));
  const previous = { value: "v1", fetchedAtMs: 0 };
  assert.equal((await resolveSharedToken("T", previous, { now: 60_000 })).value, "v1");
  assert.equal(calls.length, 0);
  assert.equal((await resolveSharedToken("T", previous, { now: 11 * 60_000 })).value, "v2");
  assert.equal(calls.length, 1);
});

test("取得に失敗したら直前の値を使い、無ければ null", async () => {
  const errors: unknown[][] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => void errors.push(args);
  try {
    stub(() => new Response("no", { status: 500 }));
    const previous = { value: "old", fetchedAtMs: 0 };
    assert.equal((await resolveSharedToken("T", previous, { now: 11 * 60_000 })).value, "old");
    assert.equal((await resolveSharedToken("T", null)).value, null);
    stub(() => {
      throw new Error("network down");
    });
    assert.equal((await resolveSharedToken("T", null)).value, null);
    // ログにBearerの値を出さない
    assert.ok(!JSON.stringify(errors).includes("bearer-secret"));
  } finally {
    console.error = realError;
  }
});

test("不正な応答は失敗として扱う", async () => {
  const realError = console.error;
  console.error = () => {};
  try {
    stub(() => new Response(JSON.stringify({ value: 1 }), { status: 200 }));
    assert.equal((await resolveSharedToken("T", null)).value, null);
  } finally {
    console.error = realError;
  }
});

test("SHARED_TOKEN_API_SECRET・ISSUE_DECK_URL が揃っていなければ取りにいかない", async () => {
  stub(() => ok("v1"));
  delete process.env.SHARED_TOKEN_API_SECRET;
  assert.equal((await resolveSharedToken("T", null)).value, null);
  process.env.SHARED_TOKEN_API_SECRET = "s";
  delete process.env.ISSUE_DECK_URL;
  assert.equal((await resolveSharedToken("T", null)).value, null);
  assert.equal(calls.length, 0);
});

test("getSharedToken: 共有トークンを優先し、取れなければ環境変数、どちらも無ければ undefined", async () => {
  process.env.TEST_FALLBACK_TOKEN = "from-env";
  stub(() => ok("from-deck"));
  assert.equal(await getSharedToken("T", "TEST_FALLBACK_TOKEN"), "from-deck");

  resetSharedTokenCache();
  const realError = console.error;
  console.error = () => {};
  try {
    stub(() => new Response("x", { status: 503 }));
    assert.equal(await getSharedToken("T", "TEST_FALLBACK_TOKEN"), "from-env");
    delete process.env.TEST_FALLBACK_TOKEN;
    assert.equal(await getSharedToken("T", "TEST_FALLBACK_TOKEN"), undefined);
  } finally {
    console.error = realError;
  }
});

test("getSharedToken: 同時の要求は1回の取得にまとめ、次の呼び出しはキャッシュを使う", async () => {
  stub(() => ok("v1"));
  const [a, b] = await Promise.all([getSharedToken("T", "X"), getSharedToken("T", "X")]);
  assert.equal(a, "v1");
  assert.equal(b, "v1");
  await getSharedToken("T", "X");
  assert.equal(calls.length, 1);
});
