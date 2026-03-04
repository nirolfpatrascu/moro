import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const { GET: authGET, POST: authPOST } = handlers;

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimit(`auth:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri" }, { status: 429 });
  }
  return authGET(request);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimit(`auth:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri" }, { status: 429 });
  }
  return authPOST(request);
}
