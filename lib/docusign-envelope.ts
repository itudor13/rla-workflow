import type { ListingFields } from "./fields";

const SMARTY_PREFIX =
  "com.docusign.extensibilityplatform.action.verify.postaladdress@1.0.0.VerifyPostalAddressInput";

type TextTab = { tabLabel: string; value: string };

function smartyTabs(fields: ListingFields, index: 0 | 1): TextTab[] {
  return [
    { tabLabel: `${SMARTY_PREFIX}[${index}].street1`, value: fields.PropertyAddress },
    { tabLabel: `${SMARTY_PREFIX}[${index}].locality`, value: fields.City },
    { tabLabel: `${SMARTY_PREFIX}[${index}].subdivision`, value: "CA" },
    { tabLabel: `${SMARTY_PREFIX}[${index}].postalCode`, value: fields.ZipCode },
  ];
}

export function buildEnvelopePayload(fields: ListingFields) {
  const textTabs: TextTab[] = [
    { tabLabel: "PropertyAddress", value: fields.PropertyAddress },
    { tabLabel: "City", value: fields.City },
    { tabLabel: "County", value: fields.County },
    { tabLabel: "ZipCode", value: fields.ZipCode },
    { tabLabel: "APN", value: fields.APN },
    { tabLabel: "OwnerName1", value: fields.OwnerName1 },
    { tabLabel: "SellerPhone", value: fields.SellerPhone.replace(/\D/g, "") },
    { tabLabel: "ListPrice", value: fields.ListPrice.replace(/[^\d.]/g, "") },
    { tabLabel: "ListingStartDate", value: fields.ListingStartDate },
    { tabLabel: "ListingTermDays", value: fields.ListingTermDays },
    { tabLabel: "ListingEndDate", value: fields.ListingEndDate },
    { tabLabel: "CommissionBuySide", value: fields.CommissionBuySide },
    { tabLabel: "CommissionSellSide", value: fields.CommissionSellSide },
    { tabLabel: "SpecialTerms", value: fields.SpecialTerms },
    ...smartyTabs(fields, 0),
    ...smartyTabs(fields, 1),
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
    templateRoles: [
      {
        roleName: "Seller",
        name: fields.OwnerName1,
        email: fields.OwnerEmail,
        routingOrder: "1",
        tabs: { textTabs },
      },
      {
        roleName: "Agent",
        name: agentName,
        email: agentEmail,
        routingOrder: "2",
      },
    ],
    status: "sent",
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
