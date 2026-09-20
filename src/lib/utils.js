export function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value ?? 0);
}
export function discountPercent(selling, discounted) {
  if (!selling || discounted == null || discounted >= selling) return 0;
  return Math.round(((selling - discounted) / selling) * 100);
}
export function assetUrl(path) {
  return path;
}
