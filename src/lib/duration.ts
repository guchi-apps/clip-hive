// 動画時間はDBには秒(Int)で保持し、UI上は分単位(小数可)で入出力する。
export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60);
}

export function secondsToMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}
