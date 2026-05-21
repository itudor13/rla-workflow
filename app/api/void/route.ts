import { NextResponse } from "next/server";
import { getDocusignAccessToken } from "@/lib/docusign-auth";

export const runtime = "nodejs";

// Voids a reviewed draft when the agent chooses to go back and edit, so it
// doesn't linger in DocuSign Drafts. Nothing was ever sent to the seller.
export async function POST(req: Request) {
  try {
    const { envelopeId } = (await req.json()) as { envelopeId?: string };
    if (!envelopeId) {
      return NextResponse.json({ error: "Missing envelopeId" }, { status: 400 });
    }

    const baseUrl = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    if (!baseUrl || !accountId) {
      return NextResponse.json({ error: "Server missing DocuSign config" }, { status: 500 });
    }

    const accessToken = await getDocusignAccessToken();
    // A draft (status "created") is deleted by voiding; this is best-effort.
    const res = await fetch(
      `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "voided", voidedReason: "Agent went back to edit" }),
      }
    );
    // Don't fail the UX if voiding fails — it's just cleanup.
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
