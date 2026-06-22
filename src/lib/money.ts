// Prices are stored as integers in paisa (1 BDT = 100 paisa) to avoid
// floating-point rounding on money. These helpers convert at the edges.

export function paisaToTaka(paisa: number): number {
  return paisa / 100;
}

export function takaToPaisa(taka: number): number {
  return Math.round(taka * 100);
}

export function formatTaka(paisa: number): string {
  return `৳${paisaToTaka(paisa).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
