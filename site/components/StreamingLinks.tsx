import type { StreamingLink } from "@/lib/platforms";

export default function StreamingLinks({ links }: { links: StreamingLink[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {links.map((link) =>
        link.url ? (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center text-center h-14 rounded-xl bg-[var(--fg)] text-[var(--bg)] text-sm font-bold px-3 hover:opacity-90 transition-opacity"
          >
            {link.name}
          </a>
        ) : (
          <div
            key={link.id}
            aria-disabled="true"
            className="flex flex-col items-center justify-center text-center h-14 rounded-xl border border-[var(--fg)]/25 text-[var(--fg)]/50 text-sm font-bold px-3"
          >
            {link.name}
            <span className="text-[10px] font-normal uppercase tracking-widest mt-0.5">
              Pronto
            </span>
          </div>
        ),
      )}
    </div>
  );
}
