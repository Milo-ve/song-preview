"use client";

import { upload } from "@vercel/blob/client";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  CLIP_DEFAULT_SECONDS,
  CLIP_MAX_SECONDS,
  CLIP_MIN_SECONDS,
  computePeaks,
  decodeAudioFile,
  defaultClipStart,
  encodeMp3,
  renderClip,
} from "@/lib/audio/clip";
import {
  extractTheme,
  loadImage,
  MIN_COVER_SIZE,
  renderCover,
  renderOg,
} from "@/lib/image";
import { PROFILE_PLACEHOLDER, PROFILE_PLATFORMS } from "@/lib/platforms";
import {
  DEFAULT_THEME,
  platformUrlsFromForm,
  type Theme,
} from "@/lib/release";
import { submitRelease } from "./actions";

const BUCKETS = 120;
const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Cover = { bitmap: ImageBitmap; theme: Theme; previewUrl: string };
type Audio = { buffer: AudioBuffer; peaks: number[]; name: string };
type Done = { path: string; previewUrl: string };

const input =
  "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--accent)]";
const fileInput =
  "w-full text-sm text-white/60 cursor-pointer file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-white/30 file:bg-white/10 file:px-4 file:py-2.5 file:font-mono file:text-sm file:font-bold file:text-white hover:file:bg-white/20 hover:file:border-[var(--accent)] focus-visible:outline-none focus-visible:file:border-[var(--accent)]";
const label =
  "flex flex-col gap-1.5 text-xs uppercase tracking-widest text-white/70";

export default function UploadForm() {
  const [cover, setCover] = useState<Cover | null>(null);
  const [audio, setAudio] = useState<Audio | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(CLIP_DEFAULT_SECONDS);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [playing, setPlaying] = useState(false);
  const playback = useRef<{
    ctx: AudioContext;
    src: AudioBufferSourceNode;
  } | null>(null);

  useEffect(() => () => void playback.current?.ctx.close(), []);

  const theme = cover?.theme ?? DEFAULT_THEME;
  const duration = audio?.buffer.duration ?? 0;
  const clipLen = Math.min(length, duration || length);

  async function onCover(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await loadImage(file);
      if (Math.min(bitmap.width, bitmap.height) < MIN_COVER_SIZE) {
        setError(
          `La portada debe medir al menos ${MIN_COVER_SIZE}×${MIN_COVER_SIZE} px (la tuya: ${bitmap.width}×${bitmap.height}).`,
        );
        return;
      }
      if (cover) URL.revokeObjectURL(cover.previewUrl);
      setCover({
        bitmap,
        theme: extractTheme(bitmap),
        previewUrl: URL.createObjectURL(file),
      });
    } catch {
      setError("No pude leer la imagen. Usa JPG o PNG.");
    }
  }

  async function onAudio(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    stop();
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Leyendo audio…");
    try {
      const buffer = await decodeAudioFile(file);
      if (buffer.duration < CLIP_MIN_SECONDS) throw new Error("short");
      setAudio({
        buffer,
        peaks: computePeaks(buffer, BUCKETS),
        name: file.name,
      });
      setLength(Math.min(CLIP_DEFAULT_SECONDS, buffer.duration));
      setStart(defaultClipStart(buffer.duration));
    } catch {
      setError(
        "No pude leer el audio. Usa WAV, MP3, AIFF o FLAC de al menos 15 segundos.",
      );
    } finally {
      setStatus(null);
    }
  }

  function stop() {
    playback.current?.src.stop();
    void playback.current?.ctx.close();
    playback.current = null;
    setPlaying(false);
  }

  function togglePlay() {
    if (!audio) return;
    if (playing) return stop();
    const ctx = new AudioContext();
    const src = ctx.createBufferSource();
    src.buffer = audio.buffer;
    src.connect(ctx.destination);
    src.onended = () => setPlaying(false);
    src.start(0, start, clipLen);
    playback.current = { ctx, src };
    setPlaying(true);
  }

  function onWaveClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    stop();
    setStart(Math.max(0, Math.min(duration - clipLen, t - clipLen / 2)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!cover) return setError("Falta la portada.");
    if (!audio) return setError("Falta el audio.");
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const code = get("code");
    const title = get("title");
    const artist = get("artist");
    stop();
    setBusy(true);
    try {
      setStatus("Cortando el adelanto…");
      const clip = await renderClip(audio.buffer, start, clipLen);
      const mp3 = await encodeMp3(clip, (p) =>
        setStatus(`Codificando MP3… ${Math.round(p * 100)}%`),
      );
      setStatus("Preparando portada…");
      const [coverJpg, ogJpg] = await Promise.all([
        renderCover(cover.bitmap),
        renderOg(cover.bitmap, cover.theme, title, artist),
      ]);

      setStatus("Subiendo archivos…");
      const folder = `uploads/${crypto.randomUUID()}`;
      const opts = {
        access: "public" as const,
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ code }),
      };
      const [clipBlob, coverBlob, ogBlob] = await Promise.all([
        upload(`${folder}/clip.mp3`, mp3, {
          ...opts,
          contentType: "audio/mpeg",
        }),
        upload(`${folder}/cover.jpg`, coverJpg, {
          ...opts,
          contentType: "image/jpeg",
        }),
        upload(`${folder}/og.jpg`, ogJpg, {
          ...opts,
          contentType: "image/jpeg",
        }),
      ]);

      setStatus("Creando tu página…");
      const result = await submitRelease(code, {
        artist,
        title,
        releaseDate: get("releaseDate"),
        distributor: get("distributor"),
        upc: get("upc"),
        isrc: get("isrc"),
        artistProfiles: platformUrlsFromForm(form, "profile_"),
        contactEmail: get("contactEmail"),
        clipUrl: clipBlob.url,
        coverUrl: coverBlob.url,
        ogUrl: ogBlob.url,
        theme: cover.theme,
      });
      if (!result.ok) throw new Error(result.error);
      setDone({ path: result.path, previewUrl: result.previewUrl });
    } catch (err) {
      const msg = (err as Error).message || "Algo falló";
      setError(/código/i.test(msg) ? "Código de acceso inválido." : msg);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  if (done) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return (
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold">¡Listo! 🎉</h2>
        <p className="text-sm opacity-80">
          Recibimos tu canción. La vamos a revisar y te avisamos por email
          cuando la página sea pública en:
        </p>
        <code className="text-sm break-all rounded-lg bg-black/30 px-3 py-2">
          {origin + done.path}
        </code>
        <a
          href={done.previewUrl}
          className="underline text-[var(--accent)] text-sm"
          target="_blank"
          rel="noreferrer"
        >
          Ver cómo se ve (vista previa privada)
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      style={{ "--accent": theme.accent } as React.CSSProperties}
    >
      <label className={label}>
        Código de acceso
        <input
          name="code"
          required
          autoComplete="off"
          className={input}
          placeholder="Te lo dimos por mensaje"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className={label}>
          Artista
          <input
            name="artist"
            required
            maxLength={80}
            className={input}
            placeholder="Como aparece en Spotify"
          />
        </label>
        <label className={label}>
          Título de la canción
          <input name="title" required maxLength={120} className={input} />
        </label>
        <label className={label}>
          Fecha de lanzamiento
          <input name="releaseDate" type="date" required className={input} />
        </label>
        <label className={label}>
          Distribuidora (opcional)
          <input
            name="distributor"
            maxLength={60}
            className={input}
            placeholder="DistroKid, ONErpm…"
          />
        </label>
        <label className={label}>
          UPC (opcional)
          <input
            name="upc"
            inputMode="numeric"
            pattern="\d{12,13}"
            className={input}
            placeholder="12–13 dígitos"
          />
        </label>
        <label className={label}>
          ISRC (opcional)
          <input name="isrc" className={input} placeholder="USRC17607839" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Tu email
          <input name="contactEmail" type="email" required className={input} />
        </label>
      </div>
      <p className="text-xs text-white/50 -mt-3">
        Con el UPC (te lo da tu distribuidora), los botones de Spotify, Apple
        Music, etc. aparecen solos el día del lanzamiento.
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${label} mb-3`}>
          Tus perfiles de artista (opcional)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROFILE_PLATFORMS.map((p) => (
            <label key={p.id} className={label}>
              {p.name}
              <input
                name={`profile_${p.id}`}
                inputMode="url"
                autoComplete="off"
                className={input}
                placeholder={PROFILE_PLACEHOLDER[p.id]}
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-white/50">
          Antes del lanzamiento, cada botón lleva a tu perfil para que la gente
          te siga y le llegue tu canción el día que sale. Ese día cambian solos
          a la canción.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={label}>
          Portada (cuadrada, mínimo {MIN_COVER_SIZE}px)
        </legend>
        <div className="flex items-center gap-4">
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */
            <img
              src={cover.previewUrl}
              alt=""
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onCover}
            className={fileInput}
          />
        </div>
        {cover && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            Colores de tu página:
            {[cover.theme.bg, cover.theme.accent, cover.theme.fg].map((c) => (
              <span
                key={c}
                className="w-5 h-5 rounded-full border border-white/30"
                style={{ background: c }}
              />
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={label}>Audio de la canción (WAV o MP3)</legend>
        <input
          type="file"
          accept="audio/*,.wav,.aif,.aiff,.flac,.mp3"
          onChange={onAudio}
          className={fileInput}
        />
        <p className="text-xs text-white/50">
          Tu canción no se sube completa: aquí mismo cortamos solo el adelanto
          que elijas.
        </p>
        {audio && (
          <div className="flex flex-col gap-3">
            <div
              onClick={onWaveClick}
              className="relative h-20 flex items-center gap-px cursor-pointer rounded-lg bg-black/20 px-1"
              title="Toca para mover el adelanto"
            >
              {audio.peaks.map((p, i) => {
                const t = (i / BUCKETS) * duration;
                const inside = t >= start && t <= start + clipLen;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(4, p * 100)}%`,
                      background: inside
                        ? theme.accent
                        : "rgba(255,255,255,0.25)",
                    }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full px-4 py-2 font-bold text-black"
                style={{ background: theme.accent }}
              >
                {playing ? "■ Detener" : "▶ Escuchar adelanto"}
              </button>
              <span className="text-white/70">
                {fmt(start)} – {fmt(start + clipLen)} ({Math.round(clipLen)} s)
              </span>
            </div>
            <label className={label}>
              Inicio
              <input
                type="range"
                min={0}
                max={Math.max(0, duration - clipLen)}
                step={0.5}
                value={start}
                onChange={(e) => (stop(), setStart(Number(e.target.value)))}
              />
            </label>
            <label className={label}>
              Duración: {Math.round(clipLen)} s
              <input
                type="range"
                min={CLIP_MIN_SECONDS}
                max={Math.min(CLIP_MAX_SECONDS, Math.floor(duration))}
                step={1}
                value={Math.round(clipLen)}
                onChange={(e) => {
                  stop();
                  const len = Number(e.target.value);
                  setLength(len);
                  setStart((s) => Math.min(s, Math.max(0, duration - len)));
                }}
              />
            </label>
          </div>
        )}
      </fieldset>

      {error && (
        <p className="text-sm rounded-lg bg-red-500/20 border border-red-400/40 px-3 py-2">
          {error}
        </p>
      )}
      {status && <p className="text-sm text-white/70">{status}</p>}

      <button
        type="submit"
        disabled={busy}
        className="h-14 rounded-xl font-bold text-black disabled:opacity-50"
        style={{ background: theme.accent }}
      >
        {busy ? "Enviando…" : "Crear mi página"}
      </button>
    </form>
  );
}
