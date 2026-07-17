"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { cn } from "@/lib/utils";
import { secondsToMinutes } from "@/lib/duration";
import type { TagDTO, VideoDTO } from "@/types";

async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.error === "string") return data.error;
    const formErrors = data?.error?.formErrors ?? data?.error?.fieldErrors;
    if (formErrors) return "入力内容を確認してください";
    return "エラーが発生しました";
  } catch {
    return "エラーが発生しました";
  }
}

export function VideoForm({ mode, video }: { mode: "create" | "edit"; video?: VideoDTO }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"URL" | "FILE">(video?.sourceType ?? "URL");
  const [title, setTitle] = useState(video?.title ?? "");
  const [url, setUrl] = useState(video?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState(video?.note ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    video?.durationSeconds != null ? String(secondsToMinutes(video.durationSeconds)) : ""
  );
  const [tags, setTags] = useState<string[]>(video?.tags.map((t) => t.name) ?? []);
  const [tagSuggestions, setTagSuggestions] = useState<TagDTO[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTagSuggestions)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "create") {
        await submitCreate();
      } else if (video) {
        await submitUpdate(video);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreate() {
    let res: Response;
    if (sourceType === "URL") {
      res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          note: note || undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
          tags,
        }),
      });
    } else {
      if (!file) throw new Error("動画ファイルを選択してください");
      const form = new FormData();
      form.set("title", title);
      form.set("file", file);
      if (note) form.set("note", note);
      if (durationMinutes) form.set("durationMinutes", durationMinutes);
      form.set("tags", JSON.stringify(tags));
      res = await fetch("/api/videos", { method: "POST", body: form });
    }
    if (!res.ok) throw new Error(await extractError(res));
    const created = await res.json();
    toast.success("動画を登録しました");
    router.push(`/videos/${created.id}`);
    router.refresh();
  }

  async function submitUpdate(target: VideoDTO) {
    const res = await fetch(`/api/videos/${target.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        ...(target.sourceType === "URL" && { url }),
        note: note || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        tags,
      }),
    });
    if (!res.ok) throw new Error(await extractError(res));
    toast.success("更新しました");
    router.push(`/videos/${target.id}`);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "create" && (
            <div className="flex gap-2">
              <SourceTypeButton
                active={sourceType === "URL"}
                onClick={() => setSourceType("URL")}
                icon={Link2}
                label="URL"
              />
              <SourceTypeButton
                active={sourceType === "FILE"}
                onClick={() => setSourceType("FILE")}
                icon={Upload}
                label="ファイル"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="任意"
            />
          </div>

          {sourceType === "URL" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/video"
                required
              />
            </div>
          ) : (
            mode === "create" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="file">動画ファイル</Label>
                <Input
                  id="file"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
            )
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationMinutes">動画時間(分)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={0}
              step={0.1}
              inputMode="decimal"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="任意"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">タグ</Label>
            <TagInput id="tags" value={tags} onChange={setTags} suggestions={tagSuggestions} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">備考</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意" />
          </div>

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "create" ? "登録する" : "更新する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SourceTypeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Link2;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
