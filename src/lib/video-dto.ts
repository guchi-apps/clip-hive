import type { Tag, Video } from "@prisma/client";

import type { VideoDTO } from "@/types";

export function serializeVideo(video: Video & { tags: Tag[] }): VideoDTO {
  return {
    id: video.id,
    userId: video.userId,
    title: video.title,
    sourceType: video.sourceType,
    url: video.url,
    storageDriver: video.storageDriver,
    storageKey: video.storageKey,
    originalFileName: video.originalFileName,
    mimeType: video.mimeType,
    fileSize: video.fileSize !== null ? video.fileSize.toString() : null,
    durationSeconds: video.durationSeconds,
    note: video.note,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    deletedAt: video.deletedAt ? video.deletedAt.toISOString() : null,
    tags: video.tags,
  };
}
