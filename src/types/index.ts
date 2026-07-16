import type { Tag } from "@prisma/client";

export type TagDTO = Tag;

export interface VideoDTO {
  id: string;
  userId: string;
  title: string;
  sourceType: "URL" | "FILE";
  url: string | null;
  storageDriver: "LOCAL" | "S3" | null;
  storageKey: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: string | null;
  durationSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  tags: TagDTO[];
}
