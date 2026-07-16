import { redirect } from "next/navigation";
import { Link2, Upload } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { serializeVideo } from "@/lib/video-dto";
import { Card } from "@/components/ui/card";
import { TrashActions } from "@/components/TrashActions";

export default async function TrashPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const records = await db.video.findMany({
    where: { userId, deletedAt: { not: null } },
    include: { tags: true },
    orderBy: { deletedAt: "desc" },
  });
  const videos = records.map(serializeVideo);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">ゴミ箱</h1>

      {videos.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">ゴミ箱は空です。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {videos.map((video) => (
            <Card key={video.id} className="flex-row items-center gap-3 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                {video.sourceType === "URL" ? <Link2 className="size-4" /> : <Upload className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{video.title}</p>
                <p className="text-xs text-muted-foreground">
                  削除日: {video.deletedAt && formatDate(video.deletedAt)}
                </p>
              </div>
              <TrashActions videoId={video.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
