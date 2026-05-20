import { NextResponse } from "next/server";
import { getDocusignAccessToken } from "@/lib/docusign-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getDocusignAccessToken();
    return NextResponse.json({ ok: true, tokenPreview: token.slice(0, 12) + "…" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
