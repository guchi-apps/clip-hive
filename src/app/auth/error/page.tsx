import Link from "next/link";
import { OctagonAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <OctagonAlert className="size-6" />
          </span>
          <CardTitle className="text-xl">ログインに失敗しました</CardTitle>
          <CardDescription>許可されていないアカウント、または時間をおいて再度お試しください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full rounded-full">
            <Link href="/auth/signin">ログインページへ戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
