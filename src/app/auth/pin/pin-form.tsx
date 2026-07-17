"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPinAction, verifyPinAction } from "@/app/actions/pin";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full rounded-full" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

const pinInputProps = {
  type: "tel" as const,
  inputMode: "numeric" as const,
  pattern: "[0-9]*",
  maxLength: 4,
  autoComplete: "off",
  required: true,
  className: "text-center text-2xl tracking-[0.5em]",
};

export function PinForm({ mode, callbackUrl }: { mode: "set" | "verify"; callbackUrl?: string }) {
  const action = mode === "set" ? setPinAction.bind(null, callbackUrl) : verifyPinAction.bind(null, callbackUrl);
  const [error, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "set" ? (
        <>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="pin">新しいPIN</Label>
            <Input id="pin" name="pin" {...pinInputProps} />
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="confirmPin">確認用PIN</Label>
            <Input id="confirmPin" name="confirmPin" {...pinInputProps} />
          </div>
        </>
      ) : (
        <div className="space-y-1.5 text-left">
          <Label htmlFor="pin">PIN</Label>
          <Input id="pin" name="pin" autoFocus {...pinInputProps} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <SubmitButton label={mode === "set" ? "設定する" : "確認する"} />
    </form>
  );
}
