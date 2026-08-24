import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-user";
import { APP_VERSION } from "@/lib/app-version";
import { formatBytes } from "@/lib/format";
import { getQuotaBytes, getUsedBytes } from "@/lib/quota";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChangelogDialog } from "@/components/ChangelogDialog";
import { SignOutButton } from "@/components/SignOutButton";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const [usedBytes, quotaBytes] = await Promise.all([getUsedBytes(user.id), Promise.resolve(getQuotaBytes())]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.image && (
              <Image src={user.image} alt="" width={48} height={48} className="rounded-full" />
            )}
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>保存容量</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, (Number(usedBytes) / Math.max(1, Number(quotaBytes))) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatBytes(usedBytes)} / {formatBytes(quotaBytes)} 使用中
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PINコード</CardTitle>
          <CardDescription>起動時の認証に使う4桁のPINを変更します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/pin">PINを変更する</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アプリ情報</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">バージョン v{APP_VERSION}</p>
          <ChangelogDialog />
        </CardContent>
      </Card>
    </div>
  );
}
