// computeChargeCents lived here to preview what the payment step would charge. That step is
// gone (no gateway is integrated; the establishment settles charges from the admin panel), so
// only the shared currency formatter remains.
export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
