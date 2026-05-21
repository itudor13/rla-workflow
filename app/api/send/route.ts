import { NextResponse } from "next/server";
import { getDocusignAccessToken } from "@/lib/docusign-auth";
import { buildEnvelopePayload } from "@/lib/docusign-envelope";
import type { ListingFields } from "@/lib/fields";
import { getAgentById, DEFAULT_AGENT } from "@/lib/agents";

export const runtime = "nodejs";

const REQUIRED_KEYS: (keyof ListingFields)[] = [
  "PropertyAddress",
  "City",
  "County",
  "ZipCode",
  "OwnerName1",
  "OwnerEmail",
  "ListPrice",
  "ListingStartDate",
  "ListingTermDays",
  "ListingEndDate",
  "CommissionBuySide",
  "CommissionSellSide",
];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      fields?: Partial<ListingFields>;
      returnUrl?: string;
      agentId?: string;
    };
    const fields = body.fields;
    const agent = getAgentById(body.agentId) || DEFAULT_AGENT;
    if (!fields) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const missing = REQUIRED_KEYS.filter(
      (k) => !fields[k] || String(fields[k]).trim() === ""
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const baseUrl = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    if (!baseUrl || !accountId) {
      return NextResponse.json(
        { error: "Server missing DOCUSIGN_BASE_URL or DOCUSIGN_ACCOUNT_ID" },
        { status: 500 }
      );
    }

    const accessToken = await getDocusignAccessToken();
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // 1) Create the envelope as a DRAFT. Nothing is sent to anyone yet — the
    //    agent reviews the filled document first, then explicitly confirms.
    const payload = buildEnvelopePayload(fields as ListingFields, "created");
    const res = await fetch(`${baseUrl}/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: "DocuSign envelope creation failed", details: data },
        { status: res.status }
      );
    }
    const envelopeId = data.envelopeId as string;

    // 2) Find the Seller recipient (the prefilled values only render in the
    //    seller's view), then build a mobile-friendly recipient PREVIEW so the
    //    agent can read the fully-filled document and catch any errors. Preview
    //    mode is read-only — it cannot accidentally sign or send.
    const recRes = await fetch(
      `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}/recipients`,
      { headers: authHeaders }
    );
    const recData = await recRes.json();
    const signers: { roleName?: string; recipientId?: string; name?: string; email?: string }[] =
      recData.signers || [];
    const seller = signers.find((s) => s.roleName === "Seller");
    if (!seller) {
      return NextResponse.json(
        { error: "Could not locate the Seller recipient on the draft", envelopeId },
        { status: 500 }
      );
    }

    // 2b) Replace the template's default Agent with the chosen listing agent,
    //     updating the existing recipient in place (avoids a duplicate agent).
    const agentRecipient = signers.find((s) => s.roleName === "Agent");
    if (agentRecipient) {
      await fetch(
        `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}/recipients`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            signers: [
              {
                recipientId: agentRecipient.recipientId,
                name: agent.name,
                email: agent.email,
              },
            ],
          }),
        }
      );
    }

    const origin =
      body.returnUrl ||
      req.headers.get("origin") ||
      process.env.APP_BASE_URL ||
      "";
    const base = origin.replace(/\/$/, "");

    const previewRes = await fetch(
      `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}/views/recipient_preview`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          returnUrl: `${base}/?ds_return=1`,
          recipientId: seller.recipientId,
          userName: seller.name,
          email: seller.email,
          authenticationMethod: "none",
        }),
      }
    );
    const previewData = await previewRes.json();
    if (!previewRes.ok) {
      return NextResponse.json(
        {
          error: "Draft created, but could not open the document preview",
          details: previewData,
          envelopeId,
        },
        { status: previewRes.status }
      );
    }

    return NextResponse.json({
      envelopeId,
      status: "created",
      previewUrl: previewData.url as string,
      reviewerName: agent.name,
      sellerEmail: fields.OwnerEmail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
