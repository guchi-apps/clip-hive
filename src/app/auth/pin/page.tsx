import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { PinForm } from "./pin-form";

export default async function PinPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const userId = await requireUserId();
  if (!userId) redirect("/auth/signin");

  const user = await db.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  const mode = user?.pinHash ? "verify" : "set";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Lock className="size-6" />
          </span>
          <CardTitle className="text-xl">{mode === "set" ? "PINを設定" : "PINを入力"}</CardTitle>
          <CardDescription>
            {mode === "set"
              ? "端末を他人に使われた際の保護のため、4桁のPINを設定してください。"
              : "続行するには4桁のPINを入力してください。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PinForm mode={mode} callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
