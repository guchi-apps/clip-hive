"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { History } from "lucide-react";

import { APP_CHANGELOG } from "@/lib/changelog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ChangelogDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History />
          更新履歴
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>更新履歴</DialogTitle>
          <DialogDescription>過去のアップデート内容を確認できます。</DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(60vh,480px)] space-y-6 overflow-y-auto pr-1">
          {APP_CHANGELOG.map((entry, index) => (
            <section
              key={entry.version}
              className={index < APP_CHANGELOG.length - 1 ? "border-b pb-6" : ""}
            >
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <h3 className="font-mono text-sm font-semibold">v{entry.version}</h3>
                <time dateTime={entry.date} className="shrink-0 text-xs text-muted-foreground">
                  {format(parseISO(entry.date), "yyyy年M月d日", { locale: ja })}
                </time>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {entry.changes.map((change) => (
                  <li key={change} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
