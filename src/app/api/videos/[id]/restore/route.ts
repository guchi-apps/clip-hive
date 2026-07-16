import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { serializeVideo } from "@/lib/video-dto";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.video.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const video = await db.video.update({
    where: { id },
    data: { deletedAt: null },
    include: { tags: true },
  });
  return Response.json(serializeVideo(video));
}
