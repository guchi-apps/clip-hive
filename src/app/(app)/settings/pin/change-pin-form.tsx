"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePinAction } from "@/app/actions/pin";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full rounded-full" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      変更する
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
  className: "text-center text-xl tracking-[0.4em]",
};

export function ChangePinForm() {
  const [message, formAction] = useActionState(changePinAction, null);
  const isSuccess = message === "PINを変更しました";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPin">現在のPIN</Label>
        <Input id="currentPin" name="currentPin" {...pinInputProps} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPin">新しいPIN</Label>
        <Input id="newPin" name="newPin" {...pinInputProps} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPin">確認用PIN</Label>
        <Input id="confirmPin" name="confirmPin" {...pinInputProps} />
      </div>
      {message && <p className={`text-sm ${isSuccess ? "text-primary" : "text-destructive"}`}>{message}</p>}
      <SubmitButton />
    </form>
  );
}
