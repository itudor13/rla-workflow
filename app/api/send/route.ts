import { NextResponse } from "next/server";
import { getDocusignAccessToken } from "@/lib/docusign-auth";
import { buildEnvelopePayload } from "@/lib/docusign-envelope";
import type { ListingFields } from "@/lib/fields";

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
    const body = (await req.json()) as { fields?: Partial<ListingFields> };
    const fields = body.fields;
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
    const payload = buildEnvelopePayload(fields as ListingFields);

    const res = await fetch(`${baseUrl}/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: "DocuSign envelope creation failed", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({
      envelopeId: data.envelopeId,
      status: data.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
