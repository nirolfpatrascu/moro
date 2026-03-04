/** Romanian standard VAT rate (19%) */
export const VAT_RATE = 0.19;

/** Multiplier: totalAmount = amountExVat * VAT_MULTIPLIER */
export const VAT_MULTIPLIER = 1 + VAT_RATE;

// ── P&L Category taxonomy (single source of truth) ─────────

/** Top-level P&L category codes */
export const PL_CATEGORIES = ["COGS", "COSTFIX", "OPEX", "TAXE", "PEOPLE"] as const;
export type PlCategoryCode = (typeof PL_CATEGORIES)[number];

/** Subcategory groupings used in dashboard P&L and COGS breakdowns */
export const COGS_CATS = ["BAR", "BUCATARIE", "CONSUMABILE", "TRANSPORT", "LIVRARE", "DIVERSE"];
export const PEOPLE_CATS = [
  "SALARII",
  "COLABORATORI",
  "TAXE SALARIU",
  "TICHETE MASA",
  "BONUSURI",
  "UNIFORME",
  "TRAINING",
];
export const OPEX_CATS = [
  "LICENTE",
  "CONSULTING",
  "CONTABILITATE",
  "AUTORIZATII",
  "MARKETING",
  "DIVERSE",
  "INVENTAR OBIECTE",
];
export const COSTFIX_CATS = ["CHIRII", "UTILITATI", "BANCA", "DIVERSE"];
export const TAXE_CATS = ["IMPOZIT VENIT", "TVA", "ALTE TAXE"];
