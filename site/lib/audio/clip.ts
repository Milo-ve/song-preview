/**
 * Browser-only audio helpers for /subir. The artist's master is decoded and cut
 * locally; only the encoded MP3 clip is ever uploaded.
 */
import { Mp3Encoder } from "@breezystack/lamejs";

export const CLIP_MIN_SECONDS = 15;
export const CLIP_MAX_SECONDS = 45;
export const CLIP_DEFAULT_SECONDS = 30;
const SAMPLE_RATE = 44100;
const FADE_SECONDS = 1;
const KBPS = 128;

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } finally {
    void ctx.close();
  }
}

/** Max absolute amplitude per bucket (0–1), for drawing a waveform. */
export function computePeaks(buffer: AudioBuffer, buckets: number): number[] {
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / buckets));
  const peaks: number[] = [];
  for (let i = 0; i < buckets; i++) {
    let max = 0;
    const end = Math.min(data.length, (i + 1) * size);
    for (let j = i * size; j < end; j += 16)
      max = Math.max(max, Math.abs(data[j]));
    peaks.push(max);
  }
  return peaks;
}

/** Default window: centered at 40% of the song (typically past the intro, near a chorus). */
export function defaultClipStart(duration: number): number {
  const len = Math.min(CLIP_DEFAULT_SECONDS, duration);
  return Math.max(0, Math.min(duration - len, duration * 0.4 - len / 2));
}

/** Cut [start, start+length), resample to 44.1 kHz stereo, apply fade in/out. */
export async function renderClip(
  buffer: AudioBuffer,
  start: number,
  length: number,
): Promise<AudioBuffer> {
  const frames = Math.ceil(length * SAMPLE_RATE);
  const offline = new OfflineAudioContext(2, frames, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  const gain = offline.createGain();
  const fade = Math.min(FADE_SECONDS, length / 4);
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(1, fade);
  gain.gain.setValueAtTime(1, length - fade);
  gain.gain.linearRampToValueAtTime(0, length);
  source.connect(gain).connect(offline.destination);
  source.start(0, start, length);
  return offline.startRendering();
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Encode to MP3 in chunks, yielding to the event loop so the UI stays responsive. */
export async function encodeMp3(
  clip: AudioBuffer,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const left = toInt16(clip.getChannelData(0));
  const right = toInt16(
    clip.numberOfChannels > 1 ? clip.getChannelData(1) : clip.getChannelData(0),
  );
  const encoder = new Mp3Encoder(2, SAMPLE_RATE, KBPS);
  const chunks: BlobPart[] = [];
  const step = 1152 * 64;
  for (let i = 0; i < left.length; i += step) {
    const out = encoder.encodeBuffer(
      left.subarray(i, i + step),
      right.subarray(i, i + step),
    );
    if (out.length) chunks.push(new Uint8Array(out));
    onProgress?.(Math.min(1, (i + step) / left.length));
    await new Promise((r) => setTimeout(r, 0));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Uint8Array(tail));
  return new Blob(chunks, { type: "audio/mpeg" });
}
