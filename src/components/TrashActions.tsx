"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function TrashActions({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRestore() {
    setPending(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("復元に失敗しました");
      toast.success("復元しました");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setPending(false);
    }
  }

  async function handlePermanentDelete() {
    setPending(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/permanent`, { method: "DELETE" });
      if (!res.ok) throw new Error("完全削除に失敗しました");
      toast.success("完全に削除しました");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
      setPending(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" size="sm" onClick={handleRestore} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        復元
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={pending}>
            <Trash2 className="size-4" />
            完全削除
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>完全に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は取り消せません。動画ファイルも削除されます。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete}>完全に削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
