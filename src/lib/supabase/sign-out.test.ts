import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { signOutLocal } from "./sign-out.ts";

test("signOutLocal は scope: local を渡して signOut を呼ぶ", async () => {
  const calls: unknown[][] = [];
  const supabase = {
    auth: {
      signOut: async (...args: unknown[]) => {
        calls.push(args);
        return { error: null };
      },
    },
  };

  const result = await signOutLocal(supabase as Parameters<typeof signOutLocal>[0]);

  assert.deepEqual(calls, [[{ scope: "local" }]]);
  assert.equal(result.error, null);
});

// ログアウトと許可外ユーザーの破棄が signOutLocal を経由し、scope 省略の signOut() へ
// 戻っていないことを確かめる（共有 Supabase の他アプリのセッションを失効させないため）。
for (const routePath of ["../../app/auth/signout/route.ts", "../../app/auth/callback/route.ts"]) {
  test(`${routePath} は signOutLocal を使い、signOut() を直接呼ばない`, () => {
    const source = readFileSync(new URL(routePath, import.meta.url), "utf8");

    assert.match(source, /signOutLocal\(supabase\)/);
    assert.doesNotMatch(source, /\.signOut\(/);
  });
}
