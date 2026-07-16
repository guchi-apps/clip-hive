import { notFound } from "next/navigation";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { serializeVideo } from "@/lib/video-dto";
import { VideoForm } from "@/components/VideoForm";

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) notFound();

  const video = await db.video.findFirst({ where: { id, userId }, include: { tags: true } });
  if (!video) notFound();

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">動画を編集</h1>
      <VideoForm mode="edit" video={serializeVideo(video)} />
    </div>
  );
}
