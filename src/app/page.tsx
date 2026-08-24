import Link from "next/link";
import { ArrowRight, Video, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
      />

      <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <Video className="size-7" />
      </span>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">clip-hive</h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        動画URLと動画ファイルをひとまとめに管理。Googleアカウントでログインして始めましょう。
      </p>

      {/* ハイドレーション前でも押せるよう、素のリンクでログインを開始する。 */}
      <Button asChild size="lg" className="mt-8 rounded-full px-6">
        <Link href="/auth/google?next=%2Fvideos" prefetch={false}>
          <ArrowRight className="size-4" />
          Googleでログイン
        </Link>
      </Button>

      <div className="mt-16 flex items-center gap-2 text-xs text-muted-foreground">
        <FolderOpen className="size-4" />
        タグでまとめて、あとから素早く見つけ出せる
      </div>
    </div>
  );
}
