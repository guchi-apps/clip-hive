"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full rounded-full" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      Googleでログイン
    </Button>
  );
}
