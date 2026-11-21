/** Browser-only image helpers for /subir: resize the cover, build the OG card, pick theme colors. */
import { DEFAULT_THEME, type Theme } from "./release";

export const COVER_SIZE = 1400;
export const MIN_COVER_SIZE = 1000;

export async function loadImage(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  return { c, ctx };
}

function toJpeg(c: HTMLCanvasElement, quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No se pudo generar la imagen")),
      "image/jpeg",
      quality,
    ),
  );
}

/** Center-crop to square and scale to COVER_SIZE. */
export function renderCover(img: ImageBitmap): Promise<Blob> {
  const side = Math.min(img.width, img.height);
  const { c, ctx } = canvas(COVER_SIZE, COVER_SIZE);
  ctx.drawImage(
    img,
    (img.width - side) / 2,
    (img.height - side) / 2,
    side,
    side,
    0,
    0,
    COVER_SIZE,
    COVER_SIZE,
  );
  return toJpeg(c);
}

/** 1200×630 social card: cover on the left over the theme background. */
export function renderOg(
  img: ImageBitmap,
  theme: Theme,
  title: string,
  artist: string,
): Promise<Blob> {
  const { c, ctx } = canvas(1200, 630);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 1200, 630);
  const side = Math.min(img.width, img.height);
  ctx.drawImage(
    img,
    (img.width - side) / 2,
    (img.height - side) / 2,
    side,
    side,
    60,
    60,
    510,
    510,
  );
  ctx.fillStyle = theme.fg;
  ctx.font = "bold 56px ui-monospace, monospace";
  wrapText(ctx, title, 620, 260, 540, 64);
  ctx.fillStyle = theme.accent;
  ctx.font = "28px ui-monospace, monospace";
  ctx.fillText(artist.toUpperCase(), 620, 200);
  ctx.fillStyle = theme.fg;
  ctx.globalAlpha = 0.7;
  ctx.font = "24px ui-monospace, monospace";
  ctx.fillText("ESCUCHA EL ADELANTO", 620, 540);
  return toJpeg(c);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  let line = "";
  let lines = 0;
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      line = word;
      if (++lines >= 3) return;
    } else line = test;
  }
  ctx.fillText(line, x, y + lines * lineH);
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const luminance = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Mix toward white until the color is at least `minLum` bright (readable on the dark background). */
function lift(r: number, g: number, b: number, minLum: number): [number, number, number] {
  let t = 0;
  let c: [number, number, number] = [r, g, b];
  while (luminance(...c) < minLum && t < 1) {
    t += 0.05;
    c = [r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t];
  }
  return c;
}

/**
 * Theme from the cover: background = darkened average color; accent = a saturated
 * cover color whose hue stands out from the background, lifted for contrast;
 * foreground = warm off-white.
 */
export function extractTheme(img: ImageBitmap): Theme {
  try {
    const { ctx } = canvas(48, 48);
    ctx.drawImage(img, 0, 0, 48, 48);
    return themeFromPixels(ctx.getImageData(0, 0, 48, 48).data);
  } catch {
    return DEFAULT_THEME;
  }
}

/** Pure part of extractTheme: RGBA pixels → theme. */
export function themeFromPixels(px: Uint8ClampedArray): Theme {
  {
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      sr += px[i];
      sg += px[i + 1];
      sb += px[i + 2];
      n++;
    }
    let [br, bg, bb] = [sr / n, sg / n, sb / n];
    const bgHue = hue(br, bg, bb);

    let best = { score: -1, r: 0, g: 0, b: 0 };
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
      const max = Math.max(r, g, b);
      const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
      const l = luminance(r, g, b);
      const dist = Math.abs(((hue(r, g, b) - bgHue + 540) % 360) - 180) / 180; // 0 = same hue, 1 = opposite
      const score = sat * (l > 0.2 && l < 0.92 ? 1 : 0.2) * (0.3 + dist);
      if (score > best.score) best = { score, r, g, b };
    }

    // Darken the background until light text is readable on it.
    while (luminance(br, bg, bb) > 0.22) {
      br *= 0.85;
      bg *= 0.85;
      bb *= 0.85;
    }
    const accent = best.score > 0.15 ? hex(...lift(best.r, best.g, best.b, 0.55)) : DEFAULT_THEME.accent;
    return { bg: hex(br, bg, bb), fg: "#f6f1ea", accent };
  }
}
