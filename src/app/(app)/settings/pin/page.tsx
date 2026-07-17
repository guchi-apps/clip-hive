import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth-user";
import { ChangePinForm } from "./change-pin-form";

export default async function SettingsPinPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/auth/signin");

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="text-sm text-muted-foreground hover:underline">
          ← 設定に戻る
        </Link>
        <h1 className="text-2xl font-semibold">PINコードを変更</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PINコード</CardTitle>
          <CardDescription>起動時の認証に使う4桁のPINを変更します。</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePinForm />
        </CardContent>
      </Card>
    </div>
  );
}
