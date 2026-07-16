"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Upload, Clock, Tag as TagIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/TagBadge";
import { formatBytes, formatDate, formatDurationMinutes } from "@/lib/format";
import type { TagDTO, VideoDTO } from "@/types";

type SortKey = "createdAt" | "updatedAt" | "title";
type Order = "asc" | "desc";

export function VideoList({
  videos,
  tags,
  usedBytes,
  quotaBytes,
}: {
  videos: VideoDTO[];
  tags: TagDTO[];
  usedBytes: string;
  quotaBytes: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<Order>("desc");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const visibleVideos = useMemo(() => {
    const filtered =
      tagFilter === "all" ? videos : videos.filter((v) => v.tags.some((t) => t.id === tagFilter));

    const sorted = [...filtered].sort((a, b) => {
      const av = sortKey === "title" ? a.title : a[sortKey];
      const bv = sortKey === "title" ? b.title : b[sortKey];
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [videos, tagFilter, sortKey, order]);

  const usagePercent = Math.min(100, (Number(usedBytes) / Math.max(1, Number(quotaBytes))) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">登録日</SelectItem>
            <SelectItem value="updatedAt">更新日</SelectItem>
            <SelectItem value="title">タイトル</SelectItem>
          </SelectContent>
        </Select>
        <Select value={order} onValueChange={(v) => setOrder(v as Order)}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">降順</SelectItem>
            <SelectItem value="asc">昇順</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="タグで絞り込む" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのタグ</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </div>
      </div>

      {visibleVideos.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          動画がありません。「登録」から追加しましょう。
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleVideos.map((video) => (
            <VideoRow key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoRow({ video }: { video: VideoDTO }) {
  const duration = formatDurationMinutes(video.durationSeconds);
  return (
    <Link href={`/videos/${video.id}`}>
      <Card className="flex-row items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {video.sourceType === "URL" ? <Link2 className="size-4" /> : <Upload className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{video.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(video.createdAt)}</span>
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {duration}
              </span>
            )}
            {video.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <TagIcon className="size-3" />
                <span className="flex flex-wrap gap-1">
                  {video.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </span>
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
