import type { NextRequest } from "next/server";

import { handlers } from "@/auth";
import { applyAuthUrlFromRequest } from "@/lib/auth-url";

export async function GET(request: NextRequest) {
  applyAuthUrlFromRequest(request.url, request.headers.get("host"), request.headers.get("x-forwarded-proto"));
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  applyAuthUrlFromRequest(request.url, request.headers.get("host"), request.headers.get("x-forwarded-proto"));
  return handlers.POST(request);
}
