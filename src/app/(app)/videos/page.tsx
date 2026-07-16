import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getQuotaBytes, getUsedBytes } from "@/lib/quota";
import { serializeVideo } from "@/lib/video-dto";
import { VideoList } from "@/components/VideoList";

export default async function VideosPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const [videos, tags, usedBytes, quotaBytes] = await Promise.all([
    db.video.findMany({
      where: { userId, deletedAt: null },
      include: { tags: true },
      orderBy: { createdAt: "desc" },
    }),
    db.tag.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    getUsedBytes(userId),
    Promise.resolve(getQuotaBytes()),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">動画一覧</h1>
      <VideoList
        videos={videos.map(serializeVideo)}
        tags={tags}
        usedBytes={usedBytes.toString()}
        quotaBytes={quotaBytes.toString()}
      />
    </div>
  );
}
