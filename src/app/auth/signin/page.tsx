import Link from "next/link";
import { OctagonAlert, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  not_allowed: "このGoogleアカウントは許可されていません。",
  auth_failed: "ログインに失敗しました。時間をおいて再度お試しください。",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const next = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/videos";
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.auth_failed) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Video className="size-6" />
          </span>
          <CardTitle className="text-xl">ログイン</CardTitle>
          <CardDescription>Googleアカウントでログインしてください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <OctagonAlert className="size-4 shrink-0" />
              {errorMessage}
            </p>
          )}
          {/* ハイドレーション前でも押せるよう、素のリンクでログインを開始する。 */}
          <Button asChild size="lg" className="w-full rounded-full">
            <Link href={`/auth/google?next=${encodeURIComponent(next)}`} prefetch={false}>
              Googleでログイン
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
