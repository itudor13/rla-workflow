import type { ListingFields } from "./fields";

type TextTab = { tabLabel: string; value: string };

// IMPORTANT: only send tabLabels that EXACTLY match tabs that exist in the
// DocuSign template. Sending labels that don't exist (e.g. positionless tabs)
// causes DocuSign to drop the recipient's entire tab set, leaving a blank doc.
//
// The CAR RLA template (7df819db-…) defines these Seller text tabs. The address
// fields (PropertyAddress/City/State/ZipCode) are repeated on pages 1–3 with the
// SAME label, so a single value auto-fills every page. There is no template tab
// for OwnerName1 (the seller name auto-fills from the recipient name via a
// fullName tab), nor for ListingStartDate / ListingTermDays.
export function buildEnvelopePayload(
  fields: ListingFields,
  status: "sent" | "created" = "created"
) {
  const textTabs: TextTab[] = [
    { tabLabel: "PropertyAddress", value: fields.PropertyAddress },
    { tabLabel: "City", value: fields.City },
    { tabLabel: "State", value: "CA" },
    { tabLabel: "ZipCode", value: fields.ZipCode },
    { tabLabel: "County", value: fields.County },
    { tabLabel: "APN", value: fields.APN },
    { tabLabel: "SellerPhone", value: fields.SellerPhone.replace(/\D/g, "") },
    { tabLabel: "ListPrice", value: fields.ListPrice.replace(/[^\d.]/g, "") },
    { tabLabel: "ListingEndDate", value: fields.ListingEndDate },
    { tabLabel: "CommissionBuySide", value: fields.CommissionBuySide },
    { tabLabel: "CommissionSellSide", value: fields.CommissionSellSide },
    { tabLabel: "SpecialTerms", value: fields.SpecialTerms },
  ].filter((t) => t.value && t.value.trim() !== "");

  const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
  const agentName = process.env.AGENT_NAME || "Ian Tudor";
  const agentEmail = process.env.AGENT_EMAIL || "ian.b.tudor@gmail.com";

  const subjectAddr = [
    fields.PropertyAddress,
    fields.City && `${fields.City}, CA ${fields.ZipCode}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    templateId,
    // Don't override routingOrder — the template already routes Seller before
    // Agent. Overriding it previously produced a duplicate Agent recipient.
    templateRoles: [
      {
        roleName: "Seller",
        name: fields.OwnerName1,
        email: fields.OwnerEmail,
        tabs: { textTabs },
      },
      {
        roleName: "Agent",
        name: agentName,
        email: agentEmail,
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
