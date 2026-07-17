import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

import busboy from "busboy";
import { Prisma } from "@prisma/client";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { minutesToSeconds } from "@/lib/duration";
import { hasCapacityFor } from "@/lib/quota";
import { getDefaultStorageDriver, getStorageAdapter } from "@/lib/storage";
import type { StorageAdapter } from "@/lib/storage";
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

interface UploadedFile {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface ParsedUpload {
  fields: Record<string, string>;
  uploaded: UploadedFile | null;
  fileError: Error | null;
  sawFile: boolean;
}

// multipart/form-data をストリームのままパースし、ファイル部分だけストレージへ直接書き込む
// (busboyのイベントで代入する変数はクロージャ経由のためTSの型絞り込みが効かないので、
//  結果はPromiseの解決値として1回だけ返し、呼び出し側では通常のconstとして扱えるようにする)
function parseUploadStream(
  userId: string,
  request: Request,
  contentType: string,
  storage: StorageAdapter
): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let uploaded: UploadedFile | null = null;
    let sawFile = false;
    let fileError: Error | null = null;
    let putPromise: Promise<void> | null = null;
    let pendingKey: string | null = null;

    const bb = busboy({ headers: { "content-type": contentType }, limits: { files: 1 } });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (_name, fileStream, info) => {
      sawFile = true;

      if (!info.mimeType.startsWith("video/")) {
        fileError = new Error("動画ファイルのみアップロードできます");
        fileStream.resume();
        return;
      }

      const extension = info.filename.includes(".")
        ? info.filename.slice(info.filename.lastIndexOf("."))
        : "";
      const key = `${userId}/${randomUUID()}${extension}`;
      pendingKey = key;

      let size = 0;
      // fileStream に直接 'data' リスナーを付けると即座に flowing モードへ切り替わってしまい、
      // storage.put() 側の書き込みパイプが mkdir 等の非同期処理を挟んで少し遅れて確立するまでの
      // 間に流れたデータが誰にも書き込まれず消える(=0バイトファイルになる)ことがある。
      // カウントを書き込みパイプ自体を構成する Transform にすることで、バックプレッシャー経由で
      // 安全にデータを受け渡す。
      const counter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          size += chunk.length;
          callback(null, chunk);
        },
      });
      pipeline(fileStream, counter).catch((error: unknown) => {
        fileError = fileError ?? (error instanceof Error ? error : new Error(String(error)));
      });

      putPromise = storage
        .put({ key, body: counter, contentType: info.mimeType })
        .then(() => {
          uploaded = { key, fileName: info.filename, mimeType: info.mimeType, size };
        })
        .catch((error: unknown) => {
          fileError = error instanceof Error ? error : new Error(String(error));
        });
    });

    bb.on("close", () => {
      (putPromise ?? Promise.resolve())
        .then(() => resolve({ fields, uploaded, fileError, sawFile }))
        .catch(reject);
    });
    bb.on("error", reject);

    const source = Readable.fromWeb(request.body as unknown as NodeWebReadableStream<Uint8Array>);
    // pipe() はソース側の error を dest(busboy) へ転送しないため、クライアントの回線切断等で
    // ソースが error を出すとリスナー不在のまま投げられプロセスごと落ちかねない。
    // pipeline() を使い、ソース/宛先いずれのエラーもここで確実に reject として処理する。
    pipeline(source, bb).catch(async (error: unknown) => {
      await (putPromise ?? Promise.resolve()).catch(() => {});
      if (pendingKey && !uploaded) {
        await storage.delete(pendingKey).catch(() => {});
      }
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

// multipart/form-data をメモリに全体展開せず、ファイル部分だけストレージへ直接ストリーミングする。
// (request.formData() は File をメモリ上に展開するため、動画のような大容量アップロードでは
//  PM2 の max_memory_restart を超えてプロセスが強制再起動されるおそれがある)
async function createFileVideo(userId: string, request: Request) {
  const contentType = request.headers.get("content-type");
  if (!contentType || !request.body) {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  // Content-Length はフォーム全体(ファイル+他フィールド)のバイト数なので、
  // 実ファイルサイズよりわずかに大きいが、事前の容量チェックには十分な近似値として使う。
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 0 && !(await hasCapacityFor(userId, BigInt(contentLength)))) {
    return Response.json({ error: "容量の上限を超えるためアップロードできません" }, { status: 413 });
  }

  const driver = getDefaultStorageDriver();
  const storage = getStorageAdapter(driver);

  let parsedUpload: ParsedUpload;
  try {
    parsedUpload = await parseUploadStream(userId, request, contentType, storage);
  } catch (error) {
    console.error("動画アップロードのストリーム処理でエラーが発生しました", error);
    return Response.json(
      { error: "アップロード中に通信エラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
  const { fields, uploaded, fileError, sawFile } = parsedUpload;

  if (!sawFile) {
    return Response.json({ error: "動画ファイルを選択してください" }, { status: 400 });
  }
  if (fileError) {
    if (uploaded) await storage.delete(uploaded.key).catch(() => {});
    return Response.json({ error: fileError.message }, { status: 400 });
  }
  if (!uploaded) {
    return Response.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }

  const parsed = VideoCommonSchema.safeParse({
    title: fields.title,
    note: fields.note || undefined,
    durationMinutes: fields.durationMinutes ? Number(fields.durationMinutes) : undefined,
    tags: fields.tags ? (JSON.parse(fields.tags) as string[]) : undefined,
  });
  if (!parsed.success) {
    await storage.delete(uploaded.key).catch(() => {});
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Content-Length が無いリクエスト(稀)向けの事後チェック。
  if (contentLength <= 0 && !(await hasCapacityFor(userId, BigInt(uploaded.size)))) {
    await storage.delete(uploaded.key).catch(() => {});
    return Response.json({ error: "容量の上限を超えるためアップロードできません" }, { status: 413 });
  }

  const { tags, durationMinutes, ...rest } = parsed.data;
  const tagIds = await resolveTagIds(userId, tags);

  const video = await db.video.create({
    data: {
      userId,
      sourceType: "FILE",
      ...rest,
      storageDriver: driver,
      storageKey: uploaded.key,
      originalFileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      fileSize: BigInt(uploaded.size),
      durationSeconds: durationMinutes !== undefined ? minutesToSeconds(durationMinutes) : null,
      ...(tagIds && { tags: { connect: tagIds.map((id) => ({ id })) } }),
    },
    include: VIDEO_INCLUDE,
  });

  return Response.json(serializeVideo(video), { status: 201 });
}
