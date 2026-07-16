import { requireUserId } from "@/lib/auth-user";
import { getQuotaBytes, getUsedBytes } from "@/lib/quota";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [usedBytes, quotaBytes] = await Promise.all([getUsedBytes(userId), Promise.resolve(getQuotaBytes())]);

  return Response.json({
    usedBytes: usedBytes.toString(),
    quotaBytes: quotaBytes.toString(),
  });
}
