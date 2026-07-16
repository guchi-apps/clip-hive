import { Readable } from "node:stream";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findFirst({ where: { id, userId } });
  if (!video) return Response.json({ error: "Not Found" }, { status: 404 });
  if (video.sourceType !== "FILE" || !video.storageDriver || !video.storageKey) {
    return Response.json({ error: "ダウンロードできる動画ファイルがありません" }, { status: 400 });
  }

  const storage = getStorageAdapter(video.storageDriver);
  const stream = await storage.createReadStream(video.storageKey);
  const fileName = encodeURIComponent(video.originalFileName ?? `${video.title}`);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": video.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      ...(video.fileSize !== null && { "Content-Length": video.fileSize.toString() }),
    },
  });
}
