import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TerminosPage from "@/app/(legal)/terminos/page";
import PrivacidadPage from "@/app/(legal)/privacidad/page";

describe("Cumplimiento legal — páginas /terminos y /privacidad", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_LEGAL_NAME", "Empresa Test Legal S.L.");
    vi.stubEnv("NEXT_PUBLIC_LEGAL_DNI", "B12345678");
    vi.stubEnv("NEXT_PUBLIC_LEGAL_ADDRESS", "Calle Prueba 1, 28001 Madrid");
    vi.stubEnv("NEXT_PUBLIC_LEGAL_EMAIL", "legal@test.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
  });

  it("renderiza /terminos con datos de variables de entorno (equivalente a .env.local)", () => {
    render(React.createElement(TerminosPage));
    expect(screen.getByRole("heading", { level: 1, name: /términos de servicio/i })).toBeTruthy();
    expect(screen.getByText(/Empresa Test Legal S\.L\./)).toBeTruthy();
    expect(screen.getByText(/B12345678/)).toBeTruthy();
    expect(screen.getByText(/Calle Prueba 1, 28001 Madrid/)).toBeTruthy();
    const mailTerminos = screen.getByRole("link", { name: /legal@test\.example\.com/i });
    expect(mailTerminos.getAttribute("href")).toBe("mailto:legal@test.example.com");
  });

  it("renderiza /privacidad con datos de variables de entorno", () => {
    render(React.createElement(PrivacidadPage));
    expect(
      screen.getByRole("heading", { level: 1, name: /política de privacidad/i }),
    ).toBeTruthy();
    expect(screen.getByText(/Empresa Test Legal S\.L\./)).toBeTruthy();
    expect(screen.getByText(/B12345678/)).toBeTruthy();
    expect(screen.getByText(/Calle Prueba 1, 28001 Madrid/)).toBeTruthy();
    const mailLinks = screen.getAllByRole("link", { name: /legal@test\.example\.com/i });
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
    expect(mailLinks[0].getAttribute("href")).toBe("mailto:legal@test.example.com");
  });

  it("muestra placeholder si faltan variables (simula .env incompleto)", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_LEGAL_NAME", "");
    render(React.createElement(TerminosPage));
    expect(screen.getByText(/Rellenar NEXT_PUBLIC_LEGAL_NAME en \.env\.local/)).toBeTruthy();
  });
});
