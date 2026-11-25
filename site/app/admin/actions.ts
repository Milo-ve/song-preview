"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { ADMIN_COOKIE } from "@/lib/auth";
import { LINKS_TAG, resolveLinks } from "@/lib/links";
import { PLATFORMS } from "@/lib/platforms";
import {
  linkOverridesSchema,
  presaveUrlSchema,
  releasePath,
  upcSchema,
  type Release,
  type ReleaseStatus,
} from "@/lib/release";
import { getRelease, saveRelease } from "@/lib/store";

async function load(formData: FormData): Promise<Release> {
  await requireAdmin();
  const release = await getRelease(
    String(formData.get("artistSlug")),
    String(formData.get("songSlug")),
  );
  if (!release) throw new Error("Release no encontrado");
  return release;
}

async function persist(release: Release) {
  await saveRelease({ ...release, updatedAt: new Date().toISOString() });
  revalidatePath(releasePath(release));
  revalidatePath("/admin");
}

export async function setStatus(formData: FormData) {
  const release = await load(formData);
  const next = String(formData.get("status")) as ReleaseStatus;
  if (!["approved", "rejected", "pending"].includes(next))
    throw new Error("Estado inválido");
  await persist({ ...release, status: next });
}

/** Saves UPC, pre-save link and manual link overrides. Blank fields clear the value. */
export async function updateLinks(formData: FormData) {
  const release = await load(formData);
  const rawUpc = String(formData.get("upc") ?? "").trim();
  const upc = rawUpc ? upcSchema.parse(rawUpc) : undefined;
  const rawPresave = String(formData.get("presaveUrl") ?? "").trim();
  const presaveUrl = rawPresave
    ? presaveUrlSchema.parse(rawPresave)
    : undefined;
  const overrides = Object.fromEntries(
    PLATFORMS.map((p) => [
      p.id,
      String(formData.get(`link_${p.id}`) ?? "").trim(),
    ]).filter(([, v]) => v),
  );
  await persist({
    ...release,
    upc,
    presaveUrl,
    linkOverrides: linkOverridesSchema.parse(overrides),
  });
}

/** "Buscar links ahora": bust the hourly lookup cache, resolve now, promote to live if found. */
export async function refreshLinks(formData: FormData) {
  const release = await load(formData);
  updateTag(LINKS_TAG);
  const { isLive } = await resolveLinks(release);
  if (isLive && release.status === "approved") {
    await persist({
      ...release,
      status: "live",
      liveAt: new Date().toISOString(),
    });
  } else {
    revalidatePath(releasePath(release));
    revalidatePath("/admin");
  }
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
