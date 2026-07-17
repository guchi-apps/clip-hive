import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Download, Link2, Upload } from "lucide-react";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { formatBytes, formatDate, formatDurationMinutes } from "@/lib/format";
import { serializeVideo } from "@/lib/video-dto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TagBadge } from "@/components/TagBadge";
import { VideoActions } from "@/components/VideoActions";
import { CopyUrlButton } from "@/components/CopyUrlButton";

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) notFound();

  const record = await db.video.findFirst({ where: { id, userId }, include: { tags: true } });
  if (!record) notFound();

  const video = serializeVideo(record);
  const duration = formatDurationMinutes(video.durationSeconds);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold">{video.title || "無題"}</h1>
        {!video.deletedAt && <VideoActions videoId={video.id} />}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              {video.sourceType === "URL" ? <Link2 className="size-4" /> : <Upload className="size-4" />}
              {video.sourceType === "URL" ? "URL登録" : "ファイル登録"}
            </span>
            <span>登録日: {formatDate(video.createdAt)}</span>
            <span>更新日: {formatDate(video.updatedAt)}</span>
            {duration && <span>動画時間: {duration}</span>}
            {video.fileSize && <span>サイズ: {formatBytes(video.fileSize)}</span>}
          </div>

          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          {video.note && <p className="whitespace-pre-wrap text-sm">{video.note}</p>}

          {video.sourceType === "FILE" && (
            <video
              controls
              preload="metadata"
              className="w-full rounded-lg bg-black"
              src={`/api/videos/${video.id}/download`}
            />
          )}

          <div className="flex gap-2">
            {video.sourceType === "URL" && video.url && (
              <>
                <Button asChild size="sm">
                  <Link href={video.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    ブラウザで開く
                  </Link>
                </Button>
                <CopyUrlButton url={video.url} />
              </>
            )}
            {video.sourceType === "FILE" && (
              <Button asChild size="sm" variant="outline">
                <a href={`/api/videos/${video.id}/download?dl=1`} download={video.originalFileName ?? undefined}>
                  <Download className="size-4" />
                  ダウンロード
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
