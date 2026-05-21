import { NextResponse } from "next/server";
import { getDocusignAccessToken } from "@/lib/docusign-auth";

export const runtime = "nodejs";

// Flips a reviewed draft envelope to "sent" — this is the moment the seller is
// contacted. Called only after the agent has previewed the filled document.
export async function POST(req: Request) {
  try {
    const { envelopeId } = (await req.json()) as { envelopeId?: string };
    if (!envelopeId) {
      return NextResponse.json({ error: "Missing envelopeId" }, { status: 400 });
    }

    const baseUrl = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    if (!baseUrl || !accountId) {
      return NextResponse.json(
        { error: "Server missing DocuSign config" },
        { status: 500 }
      );
    }

    const accessToken = await getDocusignAccessToken();
    const res = await fetch(
      `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "sent" }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not send the envelope", details: data },
        { status: res.status }
      );
    }
    return NextResponse.json({ envelopeId, status: "sent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
