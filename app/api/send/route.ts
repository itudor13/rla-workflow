import { NextResponse } from "next/server";
import { getDocusignAccessToken } from "@/lib/docusign-auth";
import { buildEnvelopePayload, prefillValuesByLabel } from "@/lib/docusign-envelope";
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
    const acct = `${baseUrl}/accounts/${accountId}`;

    // 1) Create the envelope as a DRAFT so we can populate the sender pre-fill
    //    fields and set routing before anything is emailed.
    const payload = buildEnvelopePayload(fields as ListingFields, "created");
    const createRes = await fetch(`${acct}/envelopes`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return NextResponse.json(
        { error: "DocuSign envelope creation failed", details: created },
        { status: createRes.status }
      );
    }
    const envelopeId = created.envelopeId as string;

    // 2) Set the chosen agent as the FIRST signer (agent reviews + signs, which
    //    is their approval), and the seller second. Update the agent recipient
    //    in place so we don't create a duplicate of the template's default agent.
    const recRes = await fetch(`${acct}/envelopes/${envelopeId}/recipients`, {
      headers: authHeaders,
    });
    const recData = await recRes.json();
    const signers: { roleName?: string; recipientId?: string }[] = recData.signers || [];
    const agentRec = signers.find((s) => s.roleName === "Agent");
    const sellerRec = signers.find((s) => s.roleName === "Seller");
    const recipientUpdate = { signers: [] as Record<string, string>[] };
    if (agentRec)
      recipientUpdate.signers.push({
        recipientId: agentRec.recipientId!,
        name: agent.name,
        email: agent.email,
        routingOrder: "1",
      });
    if (sellerRec)
      recipientUpdate.signers.push({
        recipientId: sellerRec.recipientId!,
        routingOrder: "2",
      });
    if (recipientUpdate.signers.length) {
      await fetch(`${acct}/envelopes/${envelopeId}/recipients`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(recipientUpdate),
      });
    }

    // 3) Populate the SENDER pre-fill fields by matching Data Labels. These
    //    render for every recipient regardless of signing order. Address fields
    //    repeat across pages under the same label — set the value on each.
    const values = prefillValuesByLabel(fields as ListingFields);
    const tabsRes = await fetch(`${acct}/envelopes/${envelopeId}/documents/1/tabs`, {
      headers: authHeaders,
    });
    const tabsData = await tabsRes.json();
    const prefill: Record<string, unknown>[] = tabsData.prefillTabs?.textTabs || [];
    const toUpdate = prefill
      .filter((t) => values[t.tabLabel as string] !== undefined)
      .map((t) => ({ ...t, value: values[t.tabLabel as string], locked: "true" }));
    let prefillWarning: string | null = null;
    if (toUpdate.length) {
      const putRes = await fetch(`${acct}/envelopes/${envelopeId}/documents/1/tabs`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ prefillTabs: { textTabs: toUpdate } }),
      });
      if (!putRes.ok) prefillWarning = "Could not write some pre-fill values";
    } else {
      prefillWarning =
        "No sender pre-fill fields found on the template — did the fields get reassigned to Sender?";
    }

    // 4) Send. First stop is the agent's mobile-friendly review-and-sign email.
    const sendRes = await fetch(`${acct}/envelopes/${envelopeId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ status: "sent" }),
    });
    if (!sendRes.ok) {
      const sendErr = await sendRes.json();
      return NextResponse.json(
        { error: "Could not send the envelope", details: sendErr, envelopeId },
        { status: sendRes.status }
      );
    }

    return NextResponse.json({
      envelopeId,
      status: "sent",
      agentName: agent.name,
      agentEmail: agent.email,
      sellerEmail: fields.OwnerEmail,
      prefillWarning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
