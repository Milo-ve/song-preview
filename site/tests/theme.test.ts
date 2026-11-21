import { describe, expect, it } from "vitest";
import { themeFromPixels } from "@/lib/image";

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** 48×48 image: `ratio` of pixels in `a`, the rest in `b`. */
function pixels(a: number[], b: number[], ratio: number) {
  const px = new Uint8ClampedArray(48 * 48 * 4);
  for (let i = 0; i < 48 * 48; i++) px.set([...(i < 48 * 48 * ratio ? a : b), 255], i * 4);
  return px;
}

describe("themeFromPixels", () => {
  it("teal cover with a pink motif: accent is the pink, not the teal of the background", () => {
    const t = themeFromPixels(pixels([220, 80, 170], [20, 150, 160], 0.15));
    const [r, , b] = [1, 3, 5].map((i) => parseInt(t.accent.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b - 10); // pinkish, not teal
    expect(lum(t.bg)).toBeLessThanOrEqual(0.22);
    expect(lum(t.accent) - lum(t.bg)).toBeGreaterThan(0.3);
  });

  it("grey cover falls back to the default accent", () => {
    expect(themeFromPixels(pixels([128, 128, 128], [60, 60, 60], 0.5)).accent).toBe("#e6a7d7");
  });
});
