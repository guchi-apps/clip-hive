"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeSignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="mt-8 rounded-full px-6" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
      Googleでログイン
    </Button>
  );
}
