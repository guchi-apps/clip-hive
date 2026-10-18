import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { isPublicPath } from "./public-paths.ts";

// デプロイのヘルスチェックは VPS 上で 127.0.0.1 から未ログインのまま叩く（#207）。
test("/api/app-version は未ログインでも開ける", () => {
  assert.equal(isPublicPath("/api/app-version"), true);
});

test("他の API は公開しない", () => {
  for (const pathname of ["/api/videos", "/api/tags", "/api/storage", "/api/app-versionx", "/api"]) {
    assert.equal(isPublicPath(pathname), false, pathname);
  }
});

test("従来の公開パスは変わらない", () => {
  for (const pathname of ["/", "/auth/signin", "/auth/google", "/auth/callback", "/auth/signout"]) {
    assert.equal(isPublicPath(pathname), true, pathname);
  }
  assert.equal(isPublicPath("/videos"), false);
  assert.equal(isPublicPath("/auth/pin"), false);
});

test("/api/app-version はキャッシュさせず APP_COMMIT_SHA を返す", () => {
  const source = readFileSync(new URL("../../app/api/app-version/route.ts", import.meta.url), "utf8");

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /"Cache-Control": "no-store"/);
  assert.match(source, /sha: process\.env\.APP_COMMIT_SHA \|\| null/);
});

// 稼働中の版の照合が「HTTP 200 だけで成功」へ戻っていないことを確かめる（#207）。
test("deploy.yml は APP_COMMIT_SHA を .env へ書き、/api/app-version の sha と照合する", () => {
  const workflow = readFileSync(new URL("../../../.github/workflows/deploy.yml", import.meta.url), "utf8");

  assert.match(workflow, /APP_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /envs: APP_COMMIT_SHA,/);
  assert.match(workflow, /update_env APP_COMMIT_SHA "\$APP_COMMIT_SHA"/);
  assert.match(workflow, /curl -fsS "http:\/\/127\.0\.0\.1:\$\{PORT\}\/api\/app-version"/);
  assert.match(workflow, /grep -qF "\\"sha\\":\\"\$\{APP_COMMIT_SHA\}\\""/);
  // .env の更新が pm2 の起動より前にあること（起動時の .env に SHA が入っている）
  assert.ok(
    workflow.indexOf('update_env APP_COMMIT_SHA "$APP_COMMIT_SHA"') < workflow.indexOf("pm2 start deploy/ecosystem.config.js"),
  );
});
