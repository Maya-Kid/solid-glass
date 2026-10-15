/** One thing the context is full of, and the colour it is drawn in (a background class). */
export type ContextPart = { key: string; label: string; tokens: number; tint: string }

/** 168100 → "168.1k", 1000000 → "1M": the way a window's size is said aloud. */
function compactTokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`
  return String(n)
}

export { compactTokens }
