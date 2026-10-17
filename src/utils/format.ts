/** "1 800" (svensk tusentalsavgränsning) och "71,5" (decimalkomma). Bara för visning. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(n);
}
