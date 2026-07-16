export interface ParsedRange {
  start: number;
  end: number; // inclusive
}

// "bytes=start-end" / "bytes=start-" / "bytes=-suffixLength" の3形態に対応する。
// 不正な場合や複数レンジ指定(未対応)の場合は null を返す。
export function parseRangeHeader(rangeHeader: string, totalSize: number): ParsedRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return null;

  let start: number;
  let end: number;

  if (startStr === "") {
    const suffixLength = Number(endStr);
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    start = Number(startStr);
    end = endStr === "" ? totalSize - 1 : Number(endStr);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start < 0 || end >= totalSize) {
    return null;
  }

  return { start, end };
}
