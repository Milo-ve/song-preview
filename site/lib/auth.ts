/**
 * Minimal shared-secret auth, Web Crypto only so it runs in proxy.ts and in server code.
 * - Artists: UPLOAD_CODE gates /api/upload and the submit action.
 * - Operator: ADMIN_PASSWORD → signed cookie gates /admin (checked in proxy.ts AND in every admin action).
 */
export const ADMIN_COOKIE = "sp_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const enc = new TextEncoder();

export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function checkUploadCode(code: unknown): boolean {
  const expected = process.env.UPLOAD_CODE;
  return (
    Boolean(expected) &&
    typeof code === "string" &&
    safeEqual(code.trim(), expected!)
  );
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Cookie value proving the holder knew ADMIN_PASSWORD. Changing the password invalidates all sessions. */
export async function adminToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? hmac(pw, "song-preview-admin-v1") : null;
}

export async function isAdminToken(
  value: string | undefined,
): Promise<boolean> {
  const expected = await adminToken();
  return Boolean(expected && value && safeEqual(value, expected));
}

export function checkAdminPassword(password: unknown): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return (
    Boolean(pw) && typeof password === "string" && safeEqual(password, pw!)
  );
}
