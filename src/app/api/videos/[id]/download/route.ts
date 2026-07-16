import { Readable } from "node:stream";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { parseRangeHeader } from "@/lib/http-range";
import { getStorageAdapter } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findFirst({ where: { id, userId } });
  if (!video) return Response.json({ error: "Not Found" }, { status: 404 });
  if (video.sourceType !== "FILE" || !video.storageDriver || !video.storageKey || video.fileSize === null) {
    return Response.json({ error: "ダウンロードできる動画ファイルがありません" }, { status: 400 });
  }

  const totalSize = Number(video.fileSize);
  const contentType = video.mimeType ?? "application/octet-stream";
  const fileName = encodeURIComponent(video.originalFileName ?? video.title);
  // 既定はブラウザ内再生(inline)。明示的なダウンロード操作時のみ ?dl=1 を付けて保存させる。
  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get("dl") === "1" ? "attachment" : "inline";
  const contentDisposition = `${disposition}; filename*=UTF-8''${fileName}`;

  const storage = getStorageAdapter(video.storageDriver);
  const rangeHeader = request.headers.get("range");
  const range = rangeHeader ? parseRangeHeader(rangeHeader, totalSize) : null;

  if (rangeHeader && !range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${totalSize}` },
    });
  }

  if (range) {
    const stream = await storage.createReadStream(video.storageKey, range);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${range.start}-${range.end}/${totalSize}`,
        "Content-Length": String(range.end - range.start + 1),
      },
    });
  }

  const stream = await storage.createReadStream(video.storageKey);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Accept-Ranges": "bytes",
      "Content-Length": String(totalSize),
    },
  });
}
