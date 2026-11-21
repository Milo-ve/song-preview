import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveLinks } from "@/lib/links";
import { PLATFORMS } from "@/lib/platforms";
import {
  releasePath,
  RELEASE_STATUSES,
  type Release,
  type ReleaseStatus,
} from "@/lib/release";
import { listReleases } from "@/lib/store";
import { logout, refreshLinks, setStatus, updateLinks } from "./actions";

export const metadata: Metadata = {
  title: "Admin · releases",
  robots: { index: false },
};

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  pending: "Por revisar",
  approved: "Aprobado (próximamente)",
  live: "En vivo",
  rejected: "Rechazado",
};

const btn = "rounded-md px-3 py-1.5 text-xs font-bold";
const field =
  "rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-xs w-full";

function Hidden({ r }: { r: Release }) {
  return (
    <>
      <input type="hidden" name="artistSlug" value={r.artistSlug} />
      <input type="hidden" name="songSlug" value={r.songSlug} />
    </>
  );
}

async function ReleaseCard({ r }: { r: Release }) {
  const { links } = await resolveLinks(r);
  const path = releasePath(r);
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
        <img
          src={r.coverUrl}
          alt=""
          className="w-16 h-16 rounded-md object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate">{r.title}</h3>
          <p className="text-xs text-white/60 truncate">
            {r.artist} · sale {r.releaseDate} ·{" "}
            {r.distributor ?? "sin distribuidora"}
          </p>
          <p className="text-xs text-white/40 truncate">{r.contactEmail}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <a
          href={`${path}?k=${r.previewKey}`}
          target="_blank"
          rel="noreferrer"
          className={`${btn} bg-white/15`}
        >
          Vista previa
        </a>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className={`${btn} bg-white/15`}
        >
          {path}
        </a>
        {r.status !== "approved" && r.status !== "live" && (
          <form action={setStatus}>
            <Hidden r={r} />
            <button
              name="status"
              value="approved"
              className={`${btn} bg-emerald-400 text-black`}
            >
              Aprobar
            </button>
          </form>
        )}
        {r.status !== "rejected" && (
          <form action={setStatus}>
            <Hidden r={r} />
            <button
              name="status"
              value="rejected"
              className={`${btn} bg-red-400/80 text-black`}
            >
              {r.status === "pending" ? "Rechazar" : "Despublicar"}
            </button>
          </form>
        )}
        <form action={refreshLinks}>
          <Hidden r={r} />
          <button className={`${btn} bg-sky-300 text-black`}>
            Buscar links ahora
          </button>
        </form>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-white/70">
          UPC y links ({links.filter((l) => l.url).length} encontrados)
        </summary>
        <form action={updateLinks} className="mt-3 grid gap-2">
          <Hidden r={r} />
          <label className="grid gap-1">
            UPC
            <input
              name="upc"
              defaultValue={r.upc ?? ""}
              className={field}
              placeholder="12–13 dígitos"
            />
          </label>
          {PLATFORMS.map((p) => {
            const auto = links.find((l) => l.id === p.id)?.url;
            return (
              <label key={p.id} className="grid gap-1">
                <span>
                  {p.name}{" "}
                  {auto && !r.linkOverrides[p.id] && (
                    <a
                      href={auto}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-300"
                    >
                      (auto ✓)
                    </a>
                  )}
                </span>
                <input
                  name={`link_${p.id}`}
                  defaultValue={r.linkOverrides[p.id] ?? ""}
                  className={field}
                  placeholder="Link manual (opcional, gana sobre el automático)"
                />
              </label>
            );
          })}
          <button className={`${btn} bg-white text-black justify-self-start`}>
            Guardar
          </button>
        </form>
      </details>
    </article>
  );
}

export default async function AdminPage() {
  await requireAdmin();
  const releases = await listReleases();

  return (
    <main className="flex-1 bg-[#101418] text-white px-4 py-8">
      <div className="mx-auto max-w-3xl flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Releases</h1>
          <form action={logout}>
            <button className="text-xs text-white/60 underline">Salir</button>
          </form>
        </header>
        {releases.length === 0 && (
          <p className="text-sm text-white/60">Todavía no hay envíos.</p>
        )}
        {RELEASE_STATUSES.map((status) => {
          const group = releases.filter((r) => r.status === status);
          if (!group.length) return null;
          return (
            <section key={status} className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-widest text-white/50">
                {STATUS_LABEL[status]} · {group.length}
              </h2>
              {group.map((r) => (
                <ReleaseCard key={`${r.artistSlug}/${r.songSlug}`} r={r} />
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}
