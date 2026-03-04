import { describe, it, expect } from "vitest";
import { autoMapColumns } from "../validations/incoming-invoice";

describe("autoMapColumns", () => {
  it("maps standard Romanian Excel headers", () => {
    const headers = [
      "Locatie",
      "An",
      "Luna",
      "Categorie P&L",
      "Categorie",
      "Nr. Factura",
      "Denumire Firma",
      "Suma de plata",
      "Achitati",
      "De plata",
    ];

    const mapping = autoMapColumns(headers);

    expect(mapping.location).toBe("Locatie");
    expect(mapping.year).toBe("An");
    expect(mapping.month).toBe("Luna");
    expect(mapping.plCategory).toBe("Categorie P&L");
    expect(mapping.invoiceNumber).toBe("Nr. Factura");
    expect(mapping.supplierName).toBe("Denumire Firma");
    expect(mapping.totalAmount).toBe("Suma de plata");
    expect(mapping.paidAmount).toBe("Achitati");
    expect(mapping.remainingAmount).toBe("De plata");
  });

  it("does not double-assign headers", () => {
    const headers = ["An", "An Plata"];
    const mapping = autoMapColumns(headers);

    // "An Plata" is more specific and should match paymentYear first
    // "An" should match year
    expect(mapping.paymentYear).toBe("An Plata");
    expect(mapping.year).toBe("An");
  });

  it("handles case-insensitive matching", () => {
    const headers = ["LOCATIE", "NR. FACTURA", "FURNIZOR"];
    const mapping = autoMapColumns(headers);

    expect(mapping.location).toBe("LOCATIE");
    expect(mapping.invoiceNumber).toBe("NR. FACTURA");
    expect(mapping.supplierName).toBe("FURNIZOR");
  });
});
