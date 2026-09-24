// ユーザー単位のプロセス内ロック。容量チェックと db.video.create の間に他のアップロードが
// 割り込むと、両方が同じ使用量を基準に通過してクォータを超えるため、この2つを直列化する。
// PM2 は fork モード・instances: 1 で動かしているため、プロセス内ロックで足りる
// (クラスタモードへ変える場合は DB 側の排他が別途必要)。
const userLocks = new Map<string, Promise<unknown>>();

export async function withUserLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = userLocks.get(userId) ?? Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.catch(() => {});
  userLocks.set(userId, tail);
  try {
    return await run;
  } finally {
    // 後続の待ちが無ければマップから外し、ユーザー数に比例して膨らまないようにする
    if (userLocks.get(userId) === tail) userLocks.delete(userId);
  }
}
