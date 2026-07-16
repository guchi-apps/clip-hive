import { VideoForm } from "@/components/VideoForm";

export default function NewVideoPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">動画を登録</h1>
      <VideoForm mode="create" />
    </div>
  );
}
