import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const derived = Buffer.from(await hashPin(pin, salt), "hex");
  const stored = Buffer.from(hash, "hex");
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
}
