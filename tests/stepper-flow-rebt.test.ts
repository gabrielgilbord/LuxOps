import { describe, expect, it } from "vitest";
import {
  effectiveRebtCompanyNumberFromContext,
  isRebtLengthValidForDossierFinalize,
} from "@/lib/rebt-finalize";

/**
 * Reglas compartidas con StepperFlow: el botón "Finalizar obra y guardar firma"
 * depende de canFinalizeSignature, que exige isRebtLengthValidForDossierFinalize(effectiveRebt).
 */
describe("StepperFlow — validación REBT para finalizar obra", () => {
  it("bloquea finalización si el REBT efectivo tiene menos de 4 caracteres", () => {
    expect(isRebtLengthValidForDossierFinalize("")).toBe(false);
    expect(isRebtLengthValidForDossierFinalize("123")).toBe(false);
    expect(isRebtLengthValidForDossierFinalize("  ab ")).toBe(false);
    const short = effectiveRebtCompanyNumberFromContext({
      organizationRebtCompanyNumber: "12",
    });
    expect(isRebtLengthValidForDossierFinalize(short)).toBe(false);
  });

  it("permite finalización con REBT de organización o proyecto >= 4 caracteres", () => {
    expect(isRebtLengthValidForDossierFinalize("1234")).toBe(true);
    const fromOrg = effectiveRebtCompanyNumberFromContext({
      organizationRebtCompanyNumber: "ESB-12345",
    });
    expect(isRebtLengthValidForDossierFinalize(fromOrg)).toBe(true);
    const projectWins = effectiveRebtCompanyNumberFromContext({
      projectRebtCompanyNumber: "9999",
      organizationRebtCompanyNumber: "ORG-LARGO-TAMBIEN",
    });
    expect(isRebtLengthValidForDossierFinalize(projectWins)).toBe(true);
    expect(projectWins).toBe("9999");
  });
});
