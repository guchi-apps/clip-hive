import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * ログアウトボタン。
 *
 * クライアントJSのハイドレーション前でも押せるよう、素のフォームPOSTで /auth/signout を叩く。
 */
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="size-4" />
        ログアウト
      </Button>
    </form>
  );
}
