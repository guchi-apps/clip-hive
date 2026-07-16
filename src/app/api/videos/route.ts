import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

import { Prisma } from "@prisma/client";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { minutesToSeconds } from "@/lib/duration";
import { hasCapacityFor } from "@/lib/quota";
import { getDefaultStorageDriver, getStorageAdapter } from "@/lib/storage";
import { resolveTagIds } from "@/lib/tag-service";
import { hashUrl } from "@/lib/url-hash";
import { CreateUrlVideoSchema, VideoCommonSchema } from "@/lib/validators";
import { serializeVideo } from "@/lib/video-dto";

const VIDEO_INCLUDE = { tags: true };

function buildOrderBy(sort: string, order: "asc" | "desc") {
  switch (sort) {
    case "updatedAt":
      return { updatedAt: order };
    case "title":
      return { title: order };
    default:
      return { createdAt: order };
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trash = searchParams.get("trash") === "1";
  const tagId = searchParams.get("tagId");
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const orderBy = buildOrderBy(searchParams.get("sort") ?? "createdAt", order);

  const videos = await db.video.findMany({
    where: {
      userId,
      deletedAt: trash ? { not: null } : null,
      ...(tagId ? { tags: { some: { id: tagId } } } : {}),
    },
    include: VIDEO_INCLUDE,
    orderBy,
  });

  return Response.json(videos.map(serializeVideo));
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return createFileVideo(userId, request);
  }
  return createUrlVideo(userId, request);
}

async function createUrlVideo(userId: string, request: Request) {
  const body = await request.json();
  const parsed = CreateUrlVideoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const urlHash = hashUrl(parsed.data.url);
  const existing = await db.video.findFirst({ where: { userId, urlHash } });
  if (existing) {
    return Response.json({ error: "同じURLが既に登録されています" }, { status: 409 });
  }

  const { tags, durationMinutes, ...rest } = parsed.data;
  const tagIds = await resolveTagIds(userId, tags);

  try {
    const video = await db.video.create({
      data: {
        userId,
        sourceType: "URL",
        ...rest,
        urlHash,
        durationSeconds: durationMinutes !== undefined ? minutesToSeconds(durationMinutes) : null,
        ...(tagIds && { tags: { connect: tagIds.map((id) => ({ id })) } }),
      },
      include: VIDEO_INCLUDE,
    });
    return Response.json(serializeVideo(video), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "同じURLが既に登録されています" }, { status: 409 });
    }
    throw error;
  }
}

async function createFileVideo(userId: string, request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "動画ファイルを選択してください" }, { status: 400 });
  }
  if (!file.type.startsWith("video/")) {
    return Response.json({ error: "動画ファイルのみアップロードできます" }, { status: 400 });
  }

  const tagsRaw = form.get("tags");
  const durationMinutesRaw = form.get("durationMinutes");

  const parsed = VideoCommonSchema.safeParse({
    title: String(form.get("title") ?? ""),
    note: form.get("note") ? String(form.get("note")) : undefined,
    durationMinutes: durationMinutesRaw ? Number(durationMinutesRaw) : undefined,
    tags: tagsRaw ? (JSON.parse(String(tagsRaw)) as string[]) : undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const fileSize = BigInt(file.size);
  if (!(await hasCapacityFor(userId, fileSize))) {
    return Response.json({ error: "容量の上限を超えるためアップロードできません" }, { status: 413 });
  }

  const driver = getDefaultStorageDriver();
  const storage = getStorageAdapter(driver);
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const key = `${userId}/${randomUUID()}${extension}`;

  await storage.put({
    key,
    body: Readable.fromWeb(file.stream() as unknown as NodeWebReadableStream<Uint8Array>),
    contentType: file.type,
  });

  const { tags, durationMinutes, ...rest } = parsed.data;
  const tagIds = await resolveTagIds(userId, tags);

  const video = await db.video.create({
    data: {
      userId,
      sourceType: "FILE",
      ...rest,
      storageDriver: driver,
      storageKey: key,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize,
      durationSeconds: durationMinutes !== undefined ? minutesToSeconds(durationMinutes) : null,
      ...(tagIds && { tags: { connect: tagIds.map((id) => ({ id })) } }),
    },
    include: VIDEO_INCLUDE,
  });

  return Response.json(serializeVideo(video), { status: 201 });
}
