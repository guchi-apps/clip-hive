export function formatBytes(bytes: bigint | number | string): string {
  const value = typeof bytes === "bigint" ? Number(bytes) : Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0 GB";
  const gb = value / 1024 ** 3;
  if (gb < 1) {
    const mb = value / 1024 ** 2;
    return `${mb.toFixed(1)} MB`;
  }
  return `${gb.toFixed(1)} GB`;
}

export function formatDurationMinutes(durationSeconds: number | null): string | null {
  if (durationSeconds === null) return null;
  const minutes = Math.round((durationSeconds / 60) * 10) / 10;
  return `${minutes}分`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
