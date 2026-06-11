import type { ListingFields } from "./fields";

type TextTab = { tabLabel: string; value: string };

// The listing details now live on the template's SENDER PRE-FILL fields (not the
// Seller's), so they render for everyone regardless of signing order — including
// the agent, who signs first to review. These values are written to the draft's
// prefill tabs by /api/send after creation. Keys MUST match the template's
// pre-fill Data Labels exactly. Address fields repeat on several pages under the
// same label; we set the value on every matching tab.
export function fullPropertyAddress(fields: ListingFields): string {
  const cityStateZip = [
    fields.City,
    ["CA", fields.ZipCode].filter(Boolean).join(" ").trim(),
  ]
    .filter(Boolean)
    .join(", ");
  return [fields.PropertyAddress, cityStateZip].filter(Boolean).join(", ");
}

export function prefillValuesByLabel(
  fields: ListingFields
): Record<string, string> {
  // We include both the combined "FullPropertyAddress" (the agent's template uses
  // one address field that formats cleanly) AND the granular labels. /api/send
  // only writes to pre-fill tabs that actually exist on the document, so any
  // label without a matching tab is harmlessly ignored.
  const map: Record<string, string> = {
    FullPropertyAddress: fullPropertyAddress(fields), // pages 2-6 footer (combined)
    // Seller name as a sender pre-fill so it shows correctly to everyone
    // (the template's auto "Full Name" tab renders the wrong person). Supports
    // either label depending on what the field is named in the template.
    SellerName: fields.OwnerName1,
    OwnerName1: fields.OwnerName1,
    PropertyAddress: fields.PropertyAddress,
    City: fields.City,
    State: "CA",
    County: fields.County,
    ZipCode: fields.ZipCode,
    APN: fields.APN,
    ListPrice: fields.ListPrice.replace(/[^\d.]/g, ""),
    ListingStartDate: fields.ListingStartDate,
    ListingEndDate: fields.ListingEndDate,
    CommissionBuySide: fields.CommissionBuySide,
    CommissionSellSide: fields.CommissionSellSide,
    SpecialTerms: fields.SpecialTerms,
    // Seller contact info on page 7 (now sender pre-fill fields).
    SellerEmail: fields.OwnerEmail,
    SellerPhone: fields.SellerPhone.replace(/\D/g, ""),
  };
  // Drop empties so we don't blank out template defaults.
  for (const k of Object.keys(map)) {
    if (!map[k] || String(map[k]).trim() === "") delete map[k];
  }
  return map;
}

// All listing values now flow through Sender pre-fill (see prefillValuesByLabel
// above) — the Seller role just provides the recipient identity.
export function buildEnvelopePayload(
  fields: ListingFields,
  status: "sent" | "created" = "created"
) {
  const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
  const subjectAddr = [
    fields.PropertyAddress,
    fields.City && `${fields.City}, CA ${fields.ZipCode}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  // Only fill the Seller role here. The template's Agent recipient is updated
  // in place after creation (see /api/send) so the chosen agent replaces the
  // template's default agent instead of being added as a duplicate.
  return {
    templateId,
    templateRoles: [
      {
        roleName: "Seller",
        name: fields.OwnerName1,
        email: fields.OwnerEmail,
      },
    ],
    status,
    emailSubject: `Listing Agreement - ${subjectAddr}`,
    notification: {
      reminders: {
        reminderEnabled: "true",
        reminderDelay: "2",
        reminderFrequency: "1",
      },
    },
  };
}
