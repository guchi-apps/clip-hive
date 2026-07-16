import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { minutesToSeconds } from "@/lib/duration";
import { resolveTagIds } from "@/lib/tag-service";
import { hashUrl } from "@/lib/url-hash";
import { UpdateVideoSchema } from "@/lib/validators";
import { serializeVideo } from "@/lib/video-dto";

type Params = { params: Promise<{ id: string }> };

const VIDEO_INCLUDE = { tags: true };

export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findFirst({ where: { id, userId }, include: VIDEO_INCLUDE });
  if (!video) return Response.json({ error: "Not Found" }, { status: 404 });

  return Response.json(serializeVideo(video));
}

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.video.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const body = await request.json();
  const parsed = UpdateVideoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.url && existing.sourceType !== "URL") {
    return Response.json({ error: "ファイル登録の動画にURLは設定できません" }, { status: 400 });
  }

  let urlHash: string | undefined;
  if (parsed.data.url && parsed.data.url !== existing.url) {
    urlHash = hashUrl(parsed.data.url);
    const duplicate = await db.video.findFirst({
      where: { userId, urlHash, NOT: { id } },
    });
    if (duplicate) {
      return Response.json({ error: "同じURLが既に登録されています" }, { status: 409 });
    }
  }

  const { tags, durationMinutes, ...rest } = parsed.data;
  const tagIds = await resolveTagIds(userId, tags);

  const video = await db.video.update({
    where: { id },
    data: {
      ...rest,
      ...(urlHash && { urlHash }),
      ...(durationMinutes !== undefined && {
        durationSeconds: durationMinutes === null ? null : minutesToSeconds(durationMinutes),
      }),
      ...(tagIds && { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } }),
    },
    include: VIDEO_INCLUDE,
  });
  return Response.json(serializeVideo(video));
}

// ゴミ箱への移動(論理削除)。完全削除は permanent エンドポイントで行う。
export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.video.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  await db.video.update({ where: { id }, data: { deletedAt: new Date() } });
  return new Response(null, { status: 204 });
}
