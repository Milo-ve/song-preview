"use client";

import { useEffect, useRef, useState } from "react";

export default function PreviewPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    // Derive isPlaying from the audio element's own play/pause events (rather
    // than setting it directly in the click handler) so the button stays in
    // sync even when the browser pauses playback on its own — e.g. the tab
    // going to the background, another app taking audio focus, etc.
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="w-full rounded-2xl bg-black/20 backdrop-blur-sm px-5 py-4 flex items-center gap-4">
      <audio ref={audioRef} src={src} preload="metadata" controlsList="nodownload noplaybackrate" />
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pausar adelanto" : "Escuchar adelanto"}
        className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-colors"
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="3" y="2" width="4" height="12" />
            <rect x="9" y="2" width="4" height="12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] uppercase tracking-widest text-[var(--fg)]/60">
          Adelanto
        </span>
      </div>
    </div>
  );
}
