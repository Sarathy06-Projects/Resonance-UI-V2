export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`.replace(".0K", "K");
  return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
}
