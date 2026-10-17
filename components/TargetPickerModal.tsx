"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X, Dices, Coins, Sparkles, Brain, Timer, CheckCircle2,
  Volume2, VolumeX, Play, Pause, RotateCcw, ArrowRight,
  Flame, Target, GraduationCap, Trophy, ChevronRight, Zap, RefreshCw
} from "lucide-react";
import { AppData, Challenge, AcademicSubject } from "@/lib/types";
import { format, differenceInDays } from "date-fns";

// ─── Sound Engine (Web Audio API) ───────────────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playDiceTumble() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(160 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.05);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playWheelTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.025);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  playCoinFlip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [2300, 2480].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  playCoinLand() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.09);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const startTime = this.ctx!.currentTime + i * 0.085;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }
}

const sounds = new SoundEngine();

// ─── Visual Palette for Slices & Badges ─────────────────────────────────────
const SLICE_PALETTE = [
  { bg: "#3b82f6", text: "#ffffff", border: "#60a5fa" }, // Blue
  { bg: "#10b981", text: "#ffffff", border: "#34d399" }, // Emerald
  { bg: "#f59e0b", text: "#111827", border: "#fbbf24" }, // Amber
  { bg: "#8b5cf6", text: "#ffffff", border: "#a78bfa" }, // Purple
  { bg: "#ec4899", text: "#ffffff", border: "#f472b6" }, // Pink
  { bg: "#06b6d4", text: "#ffffff", border: "#22d3ee" }, // Cyan
  { bg: "#f97316", text: "#ffffff", border: "#fb923c" }, // Orange
  { bg: "#6366f1", text: "#ffffff", border: "#818cf8" }, // Indigo
];

export type PickerScope = "unfinished" | "all" | "academics" | "challenge";
export type DeciderMode = "dice" | "wheel" | "coin" | "smart";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData | null;
  viewDate: string;
  allTargets: string[];
  dayTargets: Record<string, boolean>;
  onToggleTarget?: (targetName: string) => void;
  onLogBlock?: (hour: number, targetName: string) => void;
  activeChallenge?: Challenge;
}

export default function TargetPickerModal({
  isOpen,
  onClose,
  appData,
  viewDate,
  allTargets,
  dayTargets,
  onToggleTarget,
  onLogBlock,
  activeChallenge
}: Props) {
  const [scope, setScope] = useState<PickerScope>("unfinished");
  const [mode, setMode] = useState<DeciderMode>("dice");
  const [isMuted, setIsMuted] = useState(false);

  // Decider selection state
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [smartAnalysis, setSmartAnalysis] = useState<{
    score: number;
    reason: string;
    actionTip: string;
    runnersUp: { name: string; score: number }[];
  } | null>(null);

  // 3D Dice rotation state
  const [diceRotation, setDiceRotation] = useState({ x: 15, y: 25, z: 0 });
  const [diceFaceIndex, setDiceFaceIndex] = useState(0);

  // Coin Flip Duel choices
  const [coinTargetA, setCoinTargetA] = useState("");
  const [coinTargetB, setCoinTargetB] = useState("");
  const [coinRotation, setCoinRotation] = useState(0);
  const [coinWinnerSide, setCoinWinnerSide] = useState<"A" | "B" | null>(null);

  // Wheel Canvas reference
  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelAngleRef = useRef(0);
  const wheelAnimationRef = useRef<number | null>(null);

  // Confetti Canvas reference
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Embedded 25-min Focus Sprint Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);

  // Load sound setting
  useEffect(() => {
    const saved = localStorage.getItem("picker_muted");
    if (saved) {
      const muted = saved === "1";
      setIsMuted(muted);
      sounds.enabled = !muted;
    }
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.enabled = !next;
    localStorage.setItem("picker_muted", next ? "1" : "0");
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Candidate pool based on scope
  const candidateTargets = useMemo(() => {
    if (scope === "unfinished") {
      const unfinished = allTargets.filter(t => !dayTargets[t]);
      return unfinished.length > 0 ? unfinished : allTargets;
    }
    if (scope === "all") {
      return allTargets;
    }
    if (scope === "challenge") {
      if (activeChallenge && activeChallenge.goals) {
        // Targets mapped to this challenge, or goals directly
        const mapped: string[] = [];
        if (activeChallenge.targetMapping) {
          Object.values(activeChallenge.targetMapping).forEach(ts => mapped.push(...ts));
        }
        const set = new Set([...mapped, ...activeChallenge.goals]);
        const list = Array.from(set);
        return list.length > 0 ? list : allTargets;
      }
      return allTargets;
    }
    if (scope === "academics") {
      if (appData?.academics && appData.academics.length > 0) {
        const academicPool: string[] = [];
        appData.academics.forEach(sub => {
          // Find first unit with incomplete lectures or tasks
          const incompleteUnit = sub.units.find(u => u.lecturesCompleted < u.lecturesTotal || u.tasks.some(t => !t.completed));
          if (incompleteUnit) {
            academicPool.push(`${sub.name}: ${incompleteUnit.title}`);
          } else {
            academicPool.push(`${sub.name} (Review)`);
          }
        });
        return academicPool.length > 0 ? academicPool : allTargets;
      }
      return allTargets;
    }
    return allTargets;
  }, [scope, allTargets, dayTargets, activeChallenge, appData?.academics]);

  // Sync Coin Duel targets when candidates change
  useEffect(() => {
    if (candidateTargets.length >= 2) {
      if (!candidateTargets.includes(coinTargetA)) setCoinTargetA(candidateTargets[0]);
      if (!candidateTargets.includes(coinTargetB) || coinTargetB === candidateTargets[0]) {
        setCoinTargetB(candidateTargets[1]);
      }
    } else if (candidateTargets.length === 1) {
      setCoinTargetA(candidateTargets[0]);
      setCoinTargetB(candidateTargets[0]);
    }
  }, [candidateTargets, coinTargetA, coinTargetB]);

  // ── Confetti Particle Burst ───────────────────────────────────────────────
  const triggerConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    const colors = ["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#38bdf8", "#e2e8f0"];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; rotation: number; vRot: number; alpha: number;
    }[] = [];

    const originX = canvas.width / 2;
    const originY = canvas.height * 0.45;

    for (let i = 0; i < 70; i++) {
      const angle = (Math.PI * 2 * i) / 70 + (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 8;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }

    let start = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.rotation += p.vRot;
        p.alpha = Math.max(0, 1 - elapsed / 2.2);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < 2.2) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  // ── Render Wheel on Canvas ────────────────────────────────────────────────
  const drawWheel = useCallback((currentAngle: number) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 14;

    ctx.clearRect(0, 0, width, height);

    const slices = candidateTargets.length;
    if (slices === 0) return;
    const arc = (Math.PI * 2) / slices;

    // Draw Slices
    for (let i = 0; i < slices; i++) {
      const angle = currentAngle + i * arc;
      const palette = SLICE_PALETTE[i % SLICE_PALETTE.length];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = palette.bg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = palette.text;
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;

      const label = candidateTargets[i];
      const maxLen = 14;
      const displayLabel = label.length > maxLen ? label.substring(0, maxLen) + "…" : label;
      ctx.fillText(displayLabel, radius - 18, 4);
      ctx.restore();

      ctx.restore();
    }

    // Outer golden rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e2b343";
    ctx.stroke();

    // Pegs on the outer rim
    for (let i = 0; i < slices; i++) {
      const pegAngle = currentAngle + i * arc;
      const pegX = centerX + (radius - 1) * Math.cos(pegAngle);
      const pegY = centerY + (radius - 1) * Math.sin(pegAngle);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.restore();

    // Center metallic hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f59e0b";
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", centerX, centerY);
    ctx.restore();

    // Pointer indicator at Top (12 o'clock = -PI/2)
    ctx.save();
    ctx.translate(centerX, centerY - radius + 2);
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-9, -8);
    ctx.lineTo(9, -8);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "rgba(239, 68, 68, 0.7)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();
  }, [candidateTargets]);

  useEffect(() => {
    if (mode === "wheel" && isOpen) {
      drawWheel(wheelAngleRef.current);
    }
  }, [mode, isOpen, drawWheel]);

  // ── Mode 1: Roll 3D Quantum Dice ──────────────────────────────────────────
  const handleRollDice = () => {
    if (isAnimating || candidateTargets.length === 0) return;
    setIsAnimating(true);
    setPickedTarget(null);

    // Pick winning index from candidates
    const winningIdx = Math.floor(Math.random() * candidateTargets.length);
    const winner = candidateTargets[winningIdx];
    const targetFace = winningIdx % 6; // Cube has 6 faces

    // Map face index to target 3D orientation
    // Face 0 (Front): x=0, y=0
    // Face 1 (Back): x=0, y=180
    // Face 2 (Right): x=0, y=-90
    // Face 3 (Left): x=0, y=90
    // Face 4 (Top): x=-90, y=0
    // Face 5 (Bottom): x=90, y=0
    const faceRotations = [
      { x: 0, y: 0 },
      { x: 0, y: 180 },
      { x: 0, y: -90 },
      { x: 0, y: 90 },
      { x: -90, y: 0 },
      { x: 90, y: 0 },
    ];

    const targetRot = faceRotations[targetFace];
    // Add extra 3-4 full revolutions for dramatic tumbling
    const extraTurnsX = 360 * 3;
    const extraTurnsY = 360 * 4;

    setDiceRotation({
      x: targetRot.x + extraTurnsX,
      y: targetRot.y + extraTurnsY,
      z: 0,
    });
    setDiceFaceIndex(targetFace);

    // Play rolling tumble sound intervals
    let count = 0;
    const tumbleInterval = setInterval(() => {
      sounds.playDiceTumble();
      count++;
      if (count > 12) clearInterval(tumbleInterval);
    }, 110);

    // Conclude after 1.6s
    setTimeout(() => {
      clearInterval(tumbleInterval);
      setIsAnimating(false);
      setPickedTarget(winner);
      sounds.playFanfare();
      triggerConfetti();
    }, 1650);
  };

  // ── Mode 2: Spin Wheel of Destiny ─────────────────────────────────────────
  const handleSpinWheel = () => {
    if (isAnimating || candidateTargets.length === 0) return;
    setIsAnimating(true);
    setPickedTarget(null);

    const slices = candidateTargets.length;
    const arc = (Math.PI * 2) / slices;

    // Pick random target
    const winningIdx = Math.floor(Math.random() * slices);
    const winner = candidateTargets[winningIdx];

    // Pointer is at -PI/2 (top)
    // Desired final angle such that winningIdx slice is centered under top pointer
    const pointerOffset = -Math.PI / 2;
    const sliceCenterAngle = winningIdx * arc + arc / 2;
    // targetFinalAngle + sliceCenterAngle = pointerOffset (mod 2PI)
    // targetFinalAngle = pointerOffset - sliceCenterAngle
    const fullSpins = Math.PI * 2 * (5 + Math.floor(Math.random() * 2));
    const targetAngle = wheelAngleRef.current + fullSpins + (pointerOffset - sliceCenterAngle - (wheelAngleRef.current % (Math.PI * 2)));

    const startAngle = wheelAngleRef.current;
    const totalDistance = targetAngle - startAngle;
    const duration = 3400; // ms
    const startTime = performance.now();

    let lastTickSlice = -1;

    const animateWheel = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Cubic ease-out deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3.2);
      const currentAngle = startAngle + totalDistance * easeOut;
      wheelAngleRef.current = currentAngle;
      drawWheel(currentAngle);

      // Play tick sound when peg crosses top pointer
      const normalized = ((-Math.PI / 2 - currentAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const currentSlice = Math.floor(normalized / arc);
      if (currentSlice !== lastTickSlice) {
        lastTickSlice = currentSlice;
        sounds.playWheelTick();
      }

      if (progress < 1) {
        wheelAnimationRef.current = requestAnimationFrame(animateWheel);
      } else {
        setIsAnimating(false);
        setPickedTarget(winner);
        sounds.playFanfare();
        triggerConfetti();
      }
    };

    wheelAnimationRef.current = requestAnimationFrame(animateWheel);
  };

  // ── Mode 3: Flip Titan Coin Duel ──────────────────────────────────────────
  const handleFlipCoin = () => {
    if (isAnimating || !coinTargetA || !coinTargetB) return;
    setIsAnimating(true);
    setPickedTarget(null);
    setCoinWinnerSide(null);

    const winnerIsA = Math.random() < 0.5;
    const winnerSide = winnerIsA ? "A" : "B";
    const winnerTarget = winnerIsA ? coinTargetA : coinTargetB;

    sounds.playCoinFlip();

    // 10 full 3D rotations + landing face
    // Side A (Heads): 0 deg
    // Side B (Tails): 180 deg
    const extraRotations = 360 * 6;
    const finalRot = coinRotation + extraRotations + (winnerIsA ? 0 : 180);
    setCoinRotation(finalRot);

    setTimeout(() => {
      setIsAnimating(false);
      setCoinWinnerSide(winnerSide);
      setPickedTarget(winnerTarget);
      sounds.playCoinLand();
      setTimeout(() => {
        sounds.playFanfare();
        triggerConfetti();
      }, 150);
    }, 1500);
  };

  // ── Mode 4: Smart AI Executive Strategist ──────────────────────────────────
  const handleSmartPick = () => {
    if (isAnimating || candidateTargets.length === 0) return;
    setIsAnimating(true);
    setPickedTarget(null);
    setSmartAnalysis(null);

    // Sound effects for computing
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      sounds.playWheelTick();
      tickCount++;
      if (tickCount > 6) clearInterval(tickInterval);
    }, 140);

    setTimeout(() => {
      clearInterval(tickInterval);

      // Strategic scoring algorithm:
      const scored = candidateTargets.map(t => {
        let score = 50; // base score

        // 1. Unfinished today gets heavy priority
        if (!dayTargets[t]) score += 30;

        // 2. Part of today's Top 3 morning commitments
        const todaySetup = appData?.days?.[viewDate]?.setup;
        if (todaySetup?.tasks?.includes(t)) score += 25;

        // 3. Challenge commitment
        if (activeChallenge?.goals?.includes(t)) score += 20;

        // 4. Monthly lag / pace deficit
        if (appData?.monthlyTargets) {
          const currentMonthKey = viewDate.substring(0, 7);
          const monthTargets = appData.monthlyTargets[currentMonthKey] || [];
          const meta = monthTargets.find(m => m.name === t);
          if (meta) {
            const dayNum = parseInt(viewDate.split("-")[2], 10) || 15;
            let completedDays = 0;
            Object.keys(appData.days).forEach(d => {
              if (d.startsWith(currentMonthKey) && appData.days[d]?.targets?.[t]) completedDays++;
            });
            const expectedDays = Math.max(1, dayNum);
            const deficit = expectedDays - completedDays;
            if (deficit > 0) score += Math.min(30, deficit * 4);
          }
        }

        // Slight non-deterministic nudge so it doesn't always pick the identical target on ties
        score += Math.random() * 5;

        return { name: t, score: Math.round(score) };
      });

      scored.sort((a, b) => b.score - a.score);
      const topPick = scored[0];
      const runnersUp = scored.slice(1, 4);

      let reason = "High priority: Best alignment with your daily goals and consistency pace.";
      if (!dayTargets[topPick.name]) {
        reason = `Unfinished for today. Knocking this out unlocks maximum momentum for your day.`;
      }
      if (activeChallenge?.goals?.includes(topPick.name)) {
        reason = `Direct core commitment of "${activeChallenge.name}". Keep your streak alive!`;
      }

      setSmartAnalysis({
        score: Math.min(99, topPick.score),
        reason,
        actionTip: "Recommended: Execute a focused 25-minute sprint right now to build momentum.",
        runnersUp
      });

      setIsAnimating(false);
      setPickedTarget(topPick.name);
      sounds.playFanfare();
      triggerConfetti();
    }, 1200);
  };

  // ── Focus Sprint Countdown ────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && timerRunning) {
      setTimerRunning(false);
      sounds.playFanfare();
      alert(`🎯 Focus Sprint Complete for ${pickedTarget}! Great job!`);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSecondsLeft, pickedTarget]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md fade-up">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        {/* Floating Confetti Canvas */}
        <canvas
          ref={confettiCanvasRef}
          className="absolute inset-0 pointer-events-none z-30 w-full h-full"
        />

        {/* ── Modal Header ── */}
        <div
          className="p-4 sm:p-5 flex items-center justify-between border-b relative z-10 shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-400 font-bold shadow-sm"
              style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
            >
              <Dices size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                Target Decider & Focus Studio
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Paralysis Breaker
                </span>
              </h2>
              <p className="text-xs" style={{ color: "var(--faint)" }}>
                Overwhelmed by choices? One click selects your next breakthrough target.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={isMuted ? "Unmute audio" : "Mute audio"}
              style={{ color: isMuted ? "var(--faint)" : "var(--primary)" }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--muted)" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Candidate Scope Pills ── */}
        <div
          className="px-4 py-2.5 border-b flex items-center justify-between flex-wrap gap-2 text-xs shrink-0"
          style={{ background: "var(--s2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--muted)" }}>
              Pool:
            </span>
            {(
              [
                { id: "unfinished", label: "Unfinished Today", icon: <CheckCircle2 size={12} /> },
                { id: "all", label: "All Targets", icon: <Target size={12} /> },
                { id: "academics", label: "Academics", icon: <GraduationCap size={12} /> },
                { id: "challenge", label: "Active Arc", icon: <Flame size={12} /> },
              ] as { id: PickerScope; label: string; icon: React.ReactNode }[]
            ).map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setScope(item.id);
                  setPickedTarget(null);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  scope === item.id
                    ? "bg-sky-500 text-white shadow-sm"
                    : "hover:bg-white/5 opacity-70 hover:opacity-100"
                }`}
                style={scope !== item.id ? { color: "var(--text)" } : {}}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono" style={{ color: "var(--faint)" }}>
            {candidateTargets.length} candidates in pool
          </span>
        </div>

        {/* ── Mode Navigation Tabs ── */}
        <div
          className="grid grid-cols-4 p-2 gap-1.5 border-b text-xs shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {(
            [
              { id: "dice", label: "3D Dice", icon: <Dices size={14} />, desc: "Roll 3D Cube" },
              { id: "wheel", label: "Roulette", icon: <Sparkles size={14} />, desc: "Spin Wheel" },
              { id: "coin", label: "Coin Duel", icon: <Coins size={14} />, desc: "Heads or Tails" },
              { id: "smart", label: "Smart Pick", icon: <Brain size={14} />, desc: "AI Strategist" },
            ] as { id: DeciderMode; label: string; icon: React.ReactNode; desc: string }[]
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id);
                setPickedTarget(null);
              }}
              className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                mode === tab.id
                  ? "bg-white/10 dark:bg-white/10 font-bold border"
                  : "hover:bg-white/5 opacity-60 hover:opacity-90"
              }`}
              style={{
                borderColor: mode === tab.id ? "var(--primary)" : "transparent",
                color: mode === tab.id ? "var(--text)" : "var(--muted)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className={mode === tab.id ? "text-sky-400" : ""}>{tab.icon}</span>
                <span className="text-xs">{tab.label}</span>
              </div>
              <span className="text-[9px] opacity-60 hidden sm:inline">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Body Area with Decider Graphics ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[330px] relative custom-scrollbar">

          {/* ═════════ MODE 1: 3D QUANTUM DICE ═════════ */}
          {mode === "dice" && (
            <div className="flex flex-col items-center justify-center w-full my-auto space-y-6">
              {/* 3D Stage */}
              <div className="perspective-1000 py-6 flex items-center justify-center">
                <div
                  className="w-36 h-36 relative transform-style-3d cursor-pointer"
                  style={{
                    transform: `rotateX(${diceRotation.x}deg) rotateY(${diceRotation.y}deg) rotateZ(${diceRotation.z}deg)`,
                    transition: isAnimating
                      ? "transform 1.6s cubic-bezier(0.15, 0.9, 0.2, 1)"
                      : "transform 0.4s ease-out",
                  }}
                  onClick={handleRollDice}
                  title="Click to Roll Dice!"
                >
                  {/* 6 Faces of the Cube */}
                  {[
                    { label: "Front", transform: "translateZ(72px)" },
                    { label: "Back", transform: "rotateY(180deg) translateZ(72px)" },
                    { label: "Right", transform: "rotateY(90deg) translateZ(72px)" },
                    { label: "Left", transform: "rotateY(-90deg) translateZ(72px)" },
                    { label: "Top", transform: "rotateX(90deg) translateZ(72px)" },
                    { label: "Bottom", transform: "rotateX(-90deg) translateZ(72px)" },
                  ].map((face, fIdx) => {
                    const targetName = candidateTargets[fIdx % candidateTargets.length] || "Focus";
                    const isSelected = pickedTarget === targetName && !isAnimating;
                    const palette = SLICE_PALETTE[fIdx % SLICE_PALETTE.length];

                    return (
                      <div
                        key={fIdx}
                        className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-between p-3.5 select-none shadow-2xl transition-all backface-hidden ${
                          isSelected ? "neon-glow" : ""
                        }`}
                        style={{
                          transform: face.transform,
                          background: isSelected
                            ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                            : "linear-gradient(135deg, #1e293b 0%, #111827 100%)",
                          border: `2px solid ${isSelected ? palette.bg : "rgba(255,255,255,0.15)"}`,
                          boxShadow: isSelected
                            ? `0 0 20px ${palette.bg}88`
                            : "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        {/* Pip dots header */}
                        <div className="w-full flex justify-between items-center text-[10px] font-mono opacity-60">
                          <span style={{ color: palette.bg }}>● {fIdx + 1}</span>
                          <span className="text-[8px] uppercase tracking-widest">Die Face</span>
                        </div>

                        {/* Target badge/name */}
                        <div className="text-center px-1">
                          <div
                            className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center mb-1 text-white text-xs font-black shadow-inner"
                            style={{ backgroundColor: palette.bg }}
                          >
                            {targetName.substring(0, 1)}
                          </div>
                          <p className="text-xs font-bold leading-tight line-clamp-2" style={{ color: "var(--text)" }}>
                            {targetName}
                          </p>
                        </div>

                        {/* Bottom indicator */}
                        <div className="w-full text-center">
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: `${palette.bg}22`, color: palette.bg }}
                          >
                            {fIdx + 1 === 1 ? "Top" : "Option"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRollDice}
                disabled={isAnimating || candidateTargets.length === 0}
                className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2.5 text-sm shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                }}
              >
                <Dices size={18} className={isAnimating ? "animate-spin" : ""} />
                <span>{isAnimating ? "Rolling the Cube..." : "Roll Quantum Dice 🎲"}</span>
              </button>
            </div>
          )}

          {/* ═════════ MODE 2: WHEEL OF DESTINY ═════════ */}
          {mode === "wheel" && (
            <div className="flex flex-col items-center justify-center w-full my-auto space-y-4">
              <div className="relative p-2">
                <canvas
                  ref={wheelCanvasRef}
                  width={290}
                  height={290}
                  className="rounded-full shadow-2xl cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={handleSpinWheel}
                />
              </div>

              <button
                onClick={handleSpinWheel}
                disabled={isAnimating || candidateTargets.length === 0}
                className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2.5 text-sm shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#111",
                }}
              >
                <Sparkles size={18} className={isAnimating ? "animate-spin" : ""} />
                <span>{isAnimating ? "Spinning Wheel..." : "Spin the Wheel 🎡"}</span>
              </button>
            </div>
          )}

          {/* ═════════ MODE 3: COIN FLIP DUEL ═════════ */}
          {mode === "coin" && (
            <div className="flex flex-col items-center justify-center w-full my-auto space-y-6">
              {/* Contender selectors */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                <div
                  className="p-3 rounded-xl border flex flex-col gap-1.5"
                  style={{
                    background: coinWinnerSide === "A" ? "rgba(245, 158, 11, 0.15)" : "var(--s2)",
                    borderColor: coinWinnerSide === "A" ? "#f59e0b" : "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    <span>👑 Heads (Side A)</span>
                    {coinWinnerSide === "A" && <span className="text-xs">WINNER!</span>}
                  </div>
                  <select
                    value={coinTargetA}
                    onChange={e => setCoinTargetA(e.target.value)}
                    disabled={isAnimating}
                    className="text-xs font-bold bg-transparent border rounded p-1.5"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {candidateTargets.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div
                  className="p-3 rounded-xl border flex flex-col gap-1.5"
                  style={{
                    background: coinWinnerSide === "B" ? "rgba(148, 163, 184, 0.15)" : "var(--s2)",
                    borderColor: coinWinnerSide === "B" ? "#94a3b8" : "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>⚡ Tails (Side B)</span>
                    {coinWinnerSide === "B" && <span className="text-xs font-bold text-emerald-400">WINNER!</span>}
                  </div>
                  <select
                    value={coinTargetB}
                    onChange={e => setCoinTargetB(e.target.value)}
                    disabled={isAnimating}
                    className="text-xs font-bold bg-transparent border rounded p-1.5"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {candidateTargets.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3D Coin Stage */}
              <div className="perspective-800 py-3 flex items-center justify-center">
                <div
                  className="w-36 h-36 rounded-full relative transform-style-3d cursor-pointer shadow-2xl transition-transform"
                  style={{
                    transform: `rotateY(${coinRotation}deg)`,
                    transition: isAnimating
                      ? "transform 1.5s cubic-bezier(0.2, 0.8, 0.25, 1)"
                      : "transform 0.3s ease-out",
                  }}
                  onClick={handleFlipCoin}
                >
                  {/* Side A: Gold Heads */}
                  <div
                    className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-3 select-none backface-hidden shadow-2xl border-4"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 55%, #b45309 100%)",
                      borderColor: "#fef08a",
                      color: "#78350f",
                    }}
                  >
                    <span className="text-2xl font-black mb-1">👑</span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Heads</span>
                    <p className="text-[11px] font-extrabold text-center truncate max-w-[110px] mt-0.5 leading-tight">
                      {coinTargetA || "Target A"}
                    </p>
                  </div>

                  {/* Side B: Platinum Tails */}
                  <div
                    className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-3 select-none backface-hidden shadow-2xl border-4"
                    style={{
                      transform: "rotateY(180deg)",
                      background: "radial-gradient(circle at 35% 35%, #ffffff 0%, #94a3b8 55%, #475569 100%)",
                      borderColor: "#f8fafc",
                      color: "#0f172a",
                    }}
                  >
                    <span className="text-2xl font-black mb-1">⚡</span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Tails</span>
                    <p className="text-[11px] font-extrabold text-center truncate max-w-[110px] mt-0.5 leading-tight">
                      {coinTargetB || "Target B"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFlipCoin}
                disabled={isAnimating || !coinTargetA || !coinTargetB}
                className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2.5 text-sm shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #e2b343 0%, #b45309 100%)",
                  color: "#fff",
                }}
              >
                <Coins size={18} className={isAnimating ? "animate-spin" : ""} />
                <span>{isAnimating ? "Flipping High in the Air..." : "Flip the Titan Coin 🪙"}</span>
              </button>
            </div>
          )}

          {/* ═════════ MODE 4: SMART AI STRATEGIST ═════════ */}
          {mode === "smart" && (
            <div className="flex flex-col items-center justify-center w-full my-auto space-y-5">
              {!smartAnalysis && !isAnimating && (
                <div className="text-center max-w-md p-6 rounded-2xl border" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                  <Brain size={44} className="mx-auto mb-3 text-sky-400" />
                  <h3 className="font-bold text-base mb-1">Executive Priority Optimization</h3>
                  <p className="text-xs mb-5" style={{ color: "var(--faint)" }}>
                    Analyzes your daily commitments, challenge deadlines, and monthly pace deficits to recommend the single highest-leverage target to start right now.
                  </p>
                  <button
                    onClick={handleSmartPick}
                    className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-xl"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)" }}
                  >
                    <Brain size={18} />
                    <span>Run Tactical Recommendation 🧠</span>
                  </button>
                </div>
              )}

              {isAnimating && (
                <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl border border-sky-400/40 flex items-center justify-center bg-sky-500/10 text-sky-400 neon-glow">
                    <Brain size={32} className="animate-pulse" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Evaluating Priorities...</p>
                    <p className="text-xs text-[var(--faint)]">Weighing urgency, monthly pace deficit & challenge milestones</p>
                  </div>
                </div>
              )}

              {smartAnalysis && !isAnimating && (
                <div className="w-full max-w-lg space-y-4 fade-up">
                  <div
                    className="p-5 rounded-2xl border relative overflow-hidden"
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-1">
                        <Zap size={12} /> Top Recommended Pick
                      </span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        Priority Score: {smartAnalysis.score}/100
                      </span>
                    </div>

                    <h3 className="text-xl font-black mb-1.5">{pickedTarget}</h3>
                    <p className="text-xs mb-3 font-medium text-emerald-400">
                      {smartAnalysis.reason}
                    </p>
                    <p className="text-xs italic" style={{ color: "var(--faint)" }}>
                      💡 {smartAnalysis.actionTip}
                    </p>
                  </div>

                  {smartAnalysis.runnersUp.length > 0 && (
                    <div className="p-3 rounded-xl border" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                        Runner-Up Candidates
                      </p>
                      <div className="space-y-1.5">
                        {smartAnalysis.runnersUp.map(r => (
                          <div key={r.name} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-white/5">
                            <span style={{ color: "var(--text)" }}>{r.name}</span>
                            <span className="font-mono text-[10px] opacity-60">Score: {r.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-1">
                    <button
                      onClick={handleSmartPick}
                      className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} /> Re-run Strategy Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════ THE WINNING TARGET ACTION HUB ═════════ */}
          {pickedTarget && !isAnimating && (
            <div
              className="w-full max-w-lg mt-6 p-5 rounded-2xl border shadow-xl relative overflow-hidden fade-up"
              style={{
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)",
                borderColor: "rgba(56, 189, 248, 0.4)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                  <Sparkles size={13} /> Decided Focus Target
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: dayTargets[pickedTarget] ? "rgba(52, 211, 153, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: dayTargets[pickedTarget] ? "#34d399" : "#fbbf24",
                  }}
                >
                  {dayTargets[pickedTarget] ? "✓ Completed Today" : "Pending for Today"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                    {pickedTarget}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    Action cures fear and indecision. Lock in now for high-leverage execution.
                  </p>
                </div>

                {onToggleTarget && (
                  <button
                    onClick={() => onToggleTarget(pickedTarget)}
                    className="p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 shrink-0"
                    style={{
                      background: dayTargets[pickedTarget] ? "rgba(52, 211, 153, 0.2)" : "var(--s2)",
                      borderColor: dayTargets[pickedTarget] ? "#34d399" : "var(--border)",
                      color: dayTargets[pickedTarget] ? "#34d399" : "var(--text)",
                    }}
                    title="Toggle today's checkmark"
                  >
                    <CheckCircle2 size={16} />
                    <span>{dayTargets[pickedTarget] ? "Done" : "Mark Done"}</span>
                  </button>
                )}
              </div>

              {/* ── Embedded 25-min Focus Sprint Timer ── */}
              <div
                className="p-3.5 rounded-xl border mb-4 flex items-center justify-between gap-4"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      timerRunning ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-[var(--muted)]"
                    }`}
                  >
                    <Timer size={18} className={timerRunning ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Focus Sprint (Pomodoro)</div>
                    <div className="font-mono text-xl font-black">{formatTimer(timerSecondsLeft)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    style={{
                      background: timerRunning ? "#ef4444" : "var(--primary)",
                      color: "#ffffff",
                    }}
                  >
                    {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                    <span>{timerRunning ? "Pause" : "Start Sprint"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSecondsLeft(25 * 60);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--faint)]"
                    title="Reset Sprint Timer"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                {onLogBlock && (
                  <button
                    onClick={() => {
                      const nowHour = new Date().getHours();
                      onLogBlock(nowHour, pickedTarget);
                      onClose();
                    }}
                    className="btn-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <span>Log Time Block Now</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                <button
                  onClick={() => {
                    setPickedTarget(null);
                    if (mode === "dice") handleRollDice();
                    else if (mode === "wheel") handleSpinWheel();
                    else if (mode === "coin") handleFlipCoin();
                    else handleSmartPick();
                  }}
                  className="btn-ghost py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw size={14} />
                  <span>Roll Again</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── Modal Footer ── */}
        <div
          className="p-3.5 px-6 border-t flex items-center justify-between text-xs shrink-0"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--faint)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="italic">"There is nothing so useless as doing efficiently that which should not be done at all."</span>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost text-xs py-1 px-3"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
