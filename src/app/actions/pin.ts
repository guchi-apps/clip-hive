"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";
import { generateSalt, hashPin, verifyPin } from "@/lib/pin";
import { PIN_COOKIE_NAME, pinCookieOptions, signPinCookie } from "@/lib/pin-cookie";
import { PinSchema } from "@/lib/validators";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 5;

function resolveRedirectTarget(callbackUrl: string | undefined): string {
  return callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/videos";
}

async function setPinVerifiedCookie(userId: string) {
  const value = await signPinCookie(userId);
  const store = await cookies();
  store.set(PIN_COOKIE_NAME, value, pinCookieOptions);
}

export async function setPinAction(
  callbackUrl: string | undefined,
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const userId = await requireUserId();
  if (!userId) redirect("/auth/signin");

  const pin = formData.get("pin");
  const confirmPin = formData.get("confirmPin");
  const parsed = PinSchema.safeParse(pin);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "PINの形式が正しくありません";
  if (pin !== confirmPin) return "確認用のPINが一致しません";

  const salt = generateSalt();
  const hash = await hashPin(parsed.data, salt);

  await db.user.update({
    where: { id: userId },
    data: { pinHash: hash, pinSalt: salt, pinFailedAttempts: 0, pinLockedUntil: null },
  });

  await setPinVerifiedCookie(userId);
  redirect(resolveRedirectTarget(callbackUrl));
}

export async function verifyPinAction(
  callbackUrl: string | undefined,
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const userId = await requireUserId();
  if (!userId) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinSalt: true, pinFailedAttempts: true, pinLockedUntil: true },
  });
  if (!user?.pinHash || !user.pinSalt) redirect("/auth/pin");

  if (user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now()) {
    return "試行回数の上限に達しました。しばらく待ってから再度お試しください";
  }

  const pin = formData.get("pin");
  const parsed = PinSchema.safeParse(pin);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "PINの形式が正しくありません";

  const ok = await verifyPin(parsed.data, user.pinHash, user.pinSalt);
  if (!ok) {
    const attempts = user.pinFailedAttempts + 1;
    const lockedOut = attempts >= LOCKOUT_THRESHOLD;
    await db.user.update({
      where: { id: userId },
      data: {
        pinFailedAttempts: lockedOut ? 0 : attempts,
        pinLockedUntil: lockedOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    return lockedOut
      ? "試行回数の上限に達しました。しばらく待ってから再度お試しください"
      : "PINが正しくありません";
  }

  await db.user.update({ where: { id: userId }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  await setPinVerifiedCookie(userId);
  redirect(resolveRedirectTarget(callbackUrl));
}

export async function changePinAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const userId = await requireUserId();
  if (!userId) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinSalt: true },
  });

  const currentPin = formData.get("currentPin");
  const newPin = formData.get("newPin");
  const confirmPin = formData.get("confirmPin");

  if (user?.pinHash && user.pinSalt) {
    const parsedCurrent = PinSchema.safeParse(currentPin);
    if (!parsedCurrent.success) return "現在のPINを4桁の数字で入力してください";
    const ok = await verifyPin(parsedCurrent.data, user.pinHash, user.pinSalt);
    if (!ok) return "現在のPINが正しくありません";
  }

  const parsedNew = PinSchema.safeParse(newPin);
  if (!parsedNew.success) return parsedNew.error.issues[0]?.message ?? "PINの形式が正しくありません";
  if (newPin !== confirmPin) return "確認用のPINが一致しません";

  const salt = generateSalt();
  const hash = await hashPin(parsedNew.data, salt);
  await db.user.update({
    where: { id: userId },
    data: { pinHash: hash, pinSalt: salt, pinFailedAttempts: 0, pinLockedUntil: null },
  });

  await setPinVerifiedCookie(userId);
  return "PINを変更しました";
}
