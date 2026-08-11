const HEX_PATTERN = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

function normalizeHex(hex: string): string {
  const raw = hex.trim().replace("#", "");
  if (raw.length === 3) {
    return raw
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return raw;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

// WCAG relative luminance, used to pick a readable foreground for an
// arbitrary establishment brand color instead of hardcoding white/black.
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function readableForeground(hex: string): "#ffffff" | "#0a0a0a" {
  const luminance = relativeLuminance(hexToRgb(hex));
  return luminance > 0.55 ? "#0a0a0a" : "#ffffff";
}

export function normalizeHexColor(hex: string): string {
  return `#${normalizeHex(hex)}`;
}
