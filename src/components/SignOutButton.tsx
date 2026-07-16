"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      ログアウト
    </Button>
  );
}
