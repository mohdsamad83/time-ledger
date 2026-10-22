"use client";

import { HourlySoundType } from "./types";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playHourlySound(type: HourlySoundType, volume: number = 0.7) {
  if (type === "none") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), now);
  masterGain.connect(ctx.destination);

  switch (type) {
    case "zen-bell": {
      // Meditative Singing Bowl / Tibetan Bell
      // Rich fundamental + gentle harmonics + long organic decay
      const frequencies = [432, 864, 1296];
      const gains = [0.45, 0.25, 0.1];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        // Slight natural vibrato
        osc.frequency.linearRampToValueAtTime(freq * 0.998, now + 3.0);

        gain.gain.setValueAtTime(gains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 3.5);
      });
      break;
    }

    case "digital-chime": {
      // Crystal 3-note ascending chime (C6, E6, G6)
      const notes = [1046.5, 1318.5, 1568.0];
      notes.forEach((freq, i) => {
        const start = now + i * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.65);
      });
      break;
    }

    case "soft-ping": {
      // Minimalist acoustic ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }

    case "executive": {
      // Two-tone executive chime (D5 -> A5)
      const chords = [587.33, 880.0];
      chords.forEach((freq, i) => {
        const start = now + i * 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 1.25);
      });
      break;
    }

    case "arcade": {
      // Retro 8-bit victorious triad
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const start = now + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.32);
      });
      break;
    }
  }
}
