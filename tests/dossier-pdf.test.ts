import { describe, expect, it } from "vitest";
import {
  DossierGenerationError,
  generateDossierPdfBuffer,
  type DossierProject,
} from "@/lib/generate-dossier-pdf";

/** Proyecto mínimo para fallar en validación legal sin generar PDF. */
function buildProjectMissingRebt(overrides: Partial<DossierProject> = {}): DossierProject {
  return {
    id: "proj_test_1",
    cliente: "Cliente QA",
    direccion: "Calle Falsa 123",
    rebtCompanyNumber: null,
    selfConsumptionModality: "SIN_EXCEDENTES",
    cableDcSectionMm2: "6",
    cableAcSectionMm2: "10",
    updatedAt: new Date("2025-01-15T12:00:00Z"),
    organization: {
      name: "Org QA",
      logoUrl: null,
      logoPath: null,
      brandColor: "#1F2937",
      rebtCompanyNumber: null,
    },
    photos: [],
    signatures: [],
    ...overrides,
  } as unknown as DossierProject;
}

describe("generateDossierPdfBuffer", () => {
  it("lanza DossierGenerationError cuando falta REBT (org y proyecto vacíos)", async () => {
    const project = buildProjectMissingRebt();
    try {
      await generateDossierPdfBuffer(project);
      expect.fail("debía lanzar DossierGenerationError");
    } catch (e) {
      expect(e).toBeInstanceOf(DossierGenerationError);
      const err = e as DossierGenerationError;
      expect(err.code).toBe("INCOMPLETE_DOSSIER");
      expect(err.missingFields.some((f) => f.includes("REBT"))).toBe(true);
    }
  });

  it("incluye otros campos obligatorios en missingFields si también faltan", async () => {
    const project = buildProjectMissingRebt({
      selfConsumptionModality: null,
      cableDcSectionMm2: "",
      cableAcSectionMm2: "",
    });
    try {
      await generateDossierPdfBuffer(project);
      expect.fail("debía lanzar");
    } catch (e) {
      expect(e).toBeInstanceOf(DossierGenerationError);
      const err = e as DossierGenerationError;
      expect(err.missingFields.length).toBeGreaterThanOrEqual(3);
    }
  });
});
