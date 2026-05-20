export type ListingFields = {
  PropertyAddress: string;
  City: string;
  County: string;
  ZipCode: string;
  APN: string;
  OwnerName1: string;
  OwnerName2: string;
  OwnerEmail: string;
  SellerPhone: string;
  ListPrice: string;
  ListingStartDate: string;
  ListingTermDays: string;
  ListingEndDate: string;
  CommissionBuySide: string;
  CommissionSellSide: string;
  PropertyType: string;
  SpecialTerms: string;
};

export type FieldDef = {
  key: keyof ListingFields;
  label: string;
  placeholder?: string;
  required?: boolean;
  computed?: boolean;
  wide?: boolean;
  type?: "text" | "number" | "email" | "tel";
};

export const FMT = (d: Date): string =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

export const ADD_DAYS = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const TODAY = (): Date => new Date();

export const FIELDS: FieldDef[] = [
  { key: "PropertyAddress", label: "Street Address", placeholder: "1234 Maple Ave", required: true, wide: true },
  { key: "City", label: "City", placeholder: "Pasadena", required: true },
  { key: "ZipCode", label: "Zip Code", placeholder: "91101", required: true },
  { key: "County", label: "County", placeholder: "Los Angeles", required: true },
  { key: "APN", label: "APN", placeholder: "5849-016-022", required: false },
  { key: "OwnerName1", label: "Seller Name", placeholder: "Jane Smith", required: true },
  { key: "OwnerName2", label: "Seller 2 Name", placeholder: "If applicable", required: false },
  { key: "OwnerEmail", label: "Seller Email", placeholder: "jane@email.com", required: true, type: "email" },
  { key: "SellerPhone", label: "Seller Phone", placeholder: "626-555-1212", required: false, type: "tel" },
  { key: "ListPrice", label: "List Price ($)", placeholder: "1850000", required: true, type: "number" },
  { key: "ListingTermDays", label: "Listing Term (Days)", placeholder: "180", required: true, type: "number" },
  { key: "ListingStartDate", label: "Start Date", placeholder: "MM/DD/YYYY", required: true },
  { key: "ListingEndDate", label: "End Date", placeholder: "Auto-calculated", required: true, computed: true },
  { key: "CommissionBuySide", label: "Buy-Side Commission %", placeholder: "2.5", required: true, type: "number" },
  { key: "CommissionSellSide", label: "Sell-Side Commission %", placeholder: "2.5", required: true, type: "number" },
  { key: "PropertyType", label: "Property Type", placeholder: "SFR", required: false },
  { key: "SpecialTerms", label: "Special Terms", placeholder: "Any notes or conditions", required: false, wide: true },
];

export function emptyFields(): ListingFields {
  const today = TODAY();
  return {
    PropertyAddress: "",
    City: "",
    County: "Los Angeles",
    ZipCode: "",
    APN: "",
    OwnerName1: "",
    OwnerName2: "",
    OwnerEmail: "",
    SellerPhone: "",
    ListPrice: "",
    ListingStartDate: FMT(today),
    ListingTermDays: "180",
    ListingEndDate: FMT(ADD_DAYS(today, 180)),
    CommissionBuySide: "",
    CommissionSellSide: "",
    PropertyType: "",
    SpecialTerms: "",
  };
}

export function buildSystemPrompt(todayStr: string): string {
  return `You are a real estate listing agreement data extractor for California CAR forms. Given a freeform message from an agent, extract these fields into JSON:

- PropertyAddress (street address only, e.g. "1234 Maple Ave" — NOT the city/state/zip)
- City (e.g. "Pasadena")
- County (e.g. "Los Angeles")
- ZipCode (5 digits)
- APN (if mentioned)
- OwnerName1 (primary seller)
- OwnerName2 (secondary seller if any)
- OwnerEmail
- SellerPhone (digits only, no dashes or parens)
- ListPrice (number only, no $ or commas)
- ListingStartDate (MM/DD/YYYY)
- ListingTermDays (number)
- ListingEndDate (MM/DD/YYYY)
- CommissionBuySide (percentage number, e.g. "2.5")
- CommissionSellSide (percentage number, e.g. "2.5")
- PropertyType (SFR, Condo, Townhome, Multi-Family, Land)
- SpecialTerms (any notes or conditions)

Rules:
- ALWAYS split full addresses into PropertyAddress (street only), City, County, ZipCode.
- Default County to "Los Angeles" for LA-area cities (Pasadena, Glendale, Burbank, Long Beach, Santa Monica, Beverly Hills, etc.) if not stated.
- Default ListingTermDays to "180" if no term is specified.
- If no start date given, use today.
- ALWAYS calculate ListingEndDate from ListingStartDate + ListingTermDays.
- Strip phone to digits only.
- If only one total commission is given, split evenly between buy and sell side.
- If only buy-side commission given, sell-side equals buy-side.
- Use "" for anything not mentioned or inferable.
- Today is ${todayStr}.
- Return ONLY valid JSON. No markdown, no backticks, no preamble.`;
}
