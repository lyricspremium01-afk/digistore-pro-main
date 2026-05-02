export function formatPrice(amount: number, currency = "XAF"): string {
  if (currency === "XAF") {
    return `${new Intl.NumberFormat("fr-FR").format(amount)} F CFA`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export function levelLabel(lvl: number) {
  if (lvl >= 7) return "Pro Seller";
  return `Level ${lvl}`;
}
