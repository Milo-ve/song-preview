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

/**
 * Theme from the cover: background = darkened average color, accent = the most
 * saturated common color, foreground = near-white or near-black for contrast.
 */
export function extractTheme(img: ImageBitmap): Theme {
  try {
    const { ctx } = canvas(48, 48);
    ctx.drawImage(img, 0, 0, 48, 48);
    const px = ctx.getImageData(0, 0, 48, 48).data;
    let sr = 0,
      sg = 0,
      sb = 0,
      n = 0;
    let best = { score: -1, r: 230, g: 167, b: 215 };
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
      sr += r;
      sg += g;
      sb += b;
      n++;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const l = luminance(r, g, b);
      const score = sat * (l > 0.25 && l < 0.9 ? 1 : 0.2);
      if (score > best.score) best = { score, r, g, b };
    }
    let [br, bg, bb] = [sr / n, sg / n, sb / n];
    // Darken the background until light text is readable on it.
    while (luminance(br, bg, bb) > 0.22) {
      br *= 0.85;
      bg *= 0.85;
      bb *= 0.85;
    }
    return {
      bg: hex(br, bg, bb),
      fg: "#f6f1ea",
      accent:
        best.score > 0.25 ? hex(best.r, best.g, best.b) : DEFAULT_THEME.accent,
    };
  } catch {
    return DEFAULT_THEME;
  }
}
