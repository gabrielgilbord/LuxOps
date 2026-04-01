/**
 * Estimación de producción anual (kWh/año) post‑ejecución para informes.
 * Base conservadora para centro/sur de España; factor de orientación según azimut/inclinación.
 */

const BASE_KWH_PER_KWP_YEAR = 1420;

/** Suma potencias pico en W desde ítems de panel (campo peakWp). */
export function sumPanelPeakWpW(
  panelItems: Array<{ peakWp?: string | null | undefined }>,
): number {
  let sum = 0;
  for (const p of panelItems) {
    const n = Number(String(p.peakWp ?? "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) sum += n;
  }
  return sum;
}

/**
 * Convención: azimut 0° = Norte, 180° = Sur (hemisferio norte, España).
 * Inclinación óptima aproximada fija 32° (mediterráneo/península).
 */
function orientationEfficiencyFactor(azimuthDeg: number, tiltDeg: number): number {
  const azRad = ((azimuthDeg - 180) * Math.PI) / 180;
  const fAz = Math.max(0.82, Math.cos(azRad * 0.88));
  const optimalTilt = 32;
  const tiltLoss = Math.min(1, Math.abs(tiltDeg - optimalTilt) / 90) * 0.2;
  const fTilt = Math.max(0.85, 1 - tiltLoss);
  return Math.min(1.06, fAz * fTilt);
}

export function estimateAnnualYieldKwh(params: {
  totalPeakWp: number;
  azimuthDegrees: number | null | undefined;
  tiltDegrees: number | null | undefined;
}): number | null {
  const { totalPeakWp } = params;
  if (!Number.isFinite(totalPeakWp) || totalPeakWp <= 0) return null;
  const kWp = totalPeakWp / 1000;
  const az =
    params.azimuthDegrees != null && Number.isFinite(Number(params.azimuthDegrees))
      ? Number(params.azimuthDegrees)
      : 180;
  const tilt =
    params.tiltDegrees != null && Number.isFinite(Number(params.tiltDegrees))
      ? Number(params.tiltDegrees)
      : 32;
  const factor = orientationEfficiencyFactor(az, tilt);
  return Math.round(kWp * BASE_KWH_PER_KWP_YEAR * factor);
}
