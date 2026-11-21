import type { Metadata } from "next";
import UploadForm from "./UploadForm";

export const metadata: Metadata = {
  title: "Sube tu canción",
  robots: { index: false },
};

export default function SubirPage() {
  return (
    <main className="flex-1 bg-[#101418] text-white px-4 py-12">
      <div className="mx-auto w-full max-w-xl flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Crea la página de tu canción
          </h1>
          <p className="text-sm text-white/70">
            Sube la portada y el audio, elige el pedazo que quieres que la gente
            escuche, y listo. Cuando tu distribuidora active el lanzamiento, los
            links a las plataformas aparecen solos.
          </p>
        </header>
        <UploadForm />
      </div>
    </main>
  );
}
