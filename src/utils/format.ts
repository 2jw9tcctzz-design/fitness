/** "1 800" (svensk tusentalsavgränsning) och "71,5" (decimalkomma). Bara för visning. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(n);
}

/** Avrundat heltal med tusentalsavgränsning: "1 780". För näringssummor. */
export function formatRounded(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));
}
