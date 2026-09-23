import assert from "node:assert/strict";
import { test } from "node:test";

import { withUserLock } from "./user-lock.ts";

test("同じユーザーのタスクは直列に実行される", async () => {
  const order: string[] = [];
  const task = (name: string) => async () => {
    order.push(`start:${name}`);
    await new Promise((r) => setTimeout(r, 10));
    order.push(`end:${name}`);
  };
  await Promise.all([withUserLock("u", task("a")), withUserLock("u", task("b"))]);
  assert.deepEqual(order, ["start:a", "end:a", "start:b", "end:b"]);
});

test("前のタスクが失敗しても後続は実行される", async () => {
  const first = withUserLock("u2", async () => {
    throw new Error("boom");
  });
  const second = withUserLock("u2", async () => "ok");
  await assert.rejects(first);
  assert.equal(await second, "ok");
});

test("別ユーザーのタスクは並行して実行される", async () => {
  const order: string[] = [];
  const task = (name: string, ms: number) => async () => {
    await new Promise((r) => setTimeout(r, ms));
    order.push(name);
  };
  await Promise.all([withUserLock("x", task("slow", 30)), withUserLock("y", task("fast", 5))]);
  assert.deepEqual(order, ["fast", "slow"]);
});
