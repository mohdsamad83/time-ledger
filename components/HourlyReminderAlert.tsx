"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  Bell, X, Dices, ArrowRight, Clock, Volume2, Sparkles, CheckCircle2
} from "lucide-react";
import { HourlyAlertSettings, DEFAULT_HOURLY_SETTINGS, RoutineItem } from "@/lib/types";
import { playHourlySound } from "@/lib/hourly-audio";

interface Props {
  routine?: RoutineItem[];
  onOpenPicker?: () => void;
  onLogBlock?: (hour: number) => void;
}

export default function HourlyReminderAlert({ routine = [], onOpenPicker, onLogBlock }: Props) {
  // Initialize state once from localStorage to avoid initial mount re-render churn
  const [settings, setSettings] = useState<HourlyAlertSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_HOURLY_SETTINGS;
    try {
      const saved = localStorage.getItem("tl-hourly-alert-settings");
      if (saved) {
        return { ...DEFAULT_HOURLY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_HOURLY_SETTINGS;
  });

  const [activeAlert, setActiveAlert] = useState<{
    timeStr: string;
    hour: number;
    message: string;
    scheduledActivity?: string;
  } | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertHourRef = useRef<number | null>(null);

  // Keep ref up to date so listeners and timers don't cause infinite dependency re-runs
  const settingsRef = useRef<HourlyAlertSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const routineRef = useRef<RoutineItem[]>(routine);
  useEffect(() => {
    routineRef.current = routine;
  }, [routine]);

  // Trigger alert execution
  const triggerAlert = useCallback((now: Date, overrideCfg?: HourlyAlertSettings, isTest: boolean = false) => {
    const cfg = overrideCfg || settingsRef.current;
    const currentHour = now.getHours();
    const formattedTime = format(now, "h:mm a");

    // Check active hours window (if not test)
    if (!isTest && cfg.activeWindowMode === "custom-hours") {
      if (cfg.startHour <= cfg.endHour) {
        if (currentHour < cfg.startHour || currentHour > cfg.endHour) return;
      } else {
        // spans midnight (e.g. 20 to 4)
        if (currentHour < cfg.startHour && currentHour > cfg.endHour) return;
      }
    }

    // Check routine item for this hour
    let scheduledActivity: string | undefined = undefined;
    const nowMinutes = currentHour * 60 + now.getMinutes();
    const routineList = routineRef.current || [];
    for (const item of routineList) {
      if (!item.startTime || !item.endTime) continue;
      const [sHr, sMin] = item.startTime.split(":").map(Number);
      const [eHr, eMin] = item.endTime.split(":").map(Number);
      const start = sHr * 60 + (sMin || 0);
      const end = eHr * 60 + (eMin || 0);
      if (start <= end) {
        if (nowMinutes >= start && nowMinutes < end) scheduledActivity = item.activity;
      } else {
        if (nowMinutes >= start || nowMinutes < end) scheduledActivity = item.activity;
      }
    }

    // Play synthesized audio tone
    playHourlySound(cfg.sound, cfg.volume);

    // Show in-app banner alert
    setActiveAlert({
      timeStr: formattedTime,
      hour: currentHour,
      message: cfg.message || "Time to change topic! Wrap up your previous block and transition.",
      scheduledActivity,
    });

    // Send Browser Desktop Notification if enabled and permitted
    if (cfg.enableDesktopNotification && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(`🔔 ${formattedTime} — Time to Change Topic!`, {
            body: cfg.message || "Time to wrap up your previous hour and transition to your next priority.",
            icon: "/logo.jpg",
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {
          // Fallback if browser blocks constructor
        }
      }
    }

    lastAlertHourRef.current = currentHour;
  }, []);

  // Window events listener (only mounted once, decoupled from settings state loop)
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem("tl-hourly-alert-settings");
        if (saved) {
          setSettings({ ...DEFAULT_HOURLY_SETTINGS, ...JSON.parse(saved) });
        }
      } catch {
        // Ignore
      }
    };

    // Listen for manual test trigger from Settings
    const handleTest = (e: Event) => {
      const customEvent = e as CustomEvent<{ settings?: HourlyAlertSettings }>;
      const testSettings = customEvent.detail?.settings || settingsRef.current;
      triggerAlert(new Date(), testSettings, true);
    };

    window.addEventListener("tl-hourly-settings-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("tl-test-hourly-alert", handleTest);

    return () => {
      window.removeEventListener("tl-hourly-settings-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("tl-test-hourly-alert", handleTest);
    };
  }, [triggerAlert]);

  // Scheduler logic — only re-runs when schedule parameters actually change
  useEffect(() => {
    if (!settings.enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const scheduleNext = () => {
      const now = new Date();
      let targetTime = new Date(now);

      if (settings.timingMode === "top-of-hour") {
        targetTime.setHours(now.getHours() + 1, 0, 0, 0);
      } else if (settings.timingMode === "pre-hour-5") {
        if (now.getMinutes() < 55) {
          targetTime.setMinutes(55, 0, 0);
        } else {
          targetTime.setHours(now.getHours() + 1, 55, 0, 0);
        }
      } else {
        // custom interval
        const intervalMs = Math.max(5, settings.customIntervalMinutes || 60) * 60 * 1000;
        targetTime = new Date(now.getTime() + intervalMs);
      }

      const delayMs = Math.max(1000, targetTime.getTime() - now.getTime());

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        triggerAlert(new Date());
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();

    // Secondary interval check every 30s to recover from laptop sleep/wake
    const watchdog = setInterval(() => {
      const now = new Date();
      const currentMin = now.getMinutes();
      const currentHour = now.getHours();

      if (settingsRef.current.timingMode === "top-of-hour" && currentMin === 0) {
        if (lastAlertHourRef.current !== currentHour) {
          triggerAlert(now);
        }
      }
    }, 30000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      clearInterval(watchdog);
    };
  }, [
    settings.enabled,
    settings.timingMode,
    settings.customIntervalMinutes,
    settings.startHour,
    settings.endHour,
    settings.activeWindowMode,
    triggerAlert
  ]);

  // Auto-dismiss alert after 35 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 35000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const previousHour = (activeAlert.hour - 1 + 24) % 24;

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-md w-[calc(100vw-32px)] fade-up select-none">
      <div
        className="rounded-2xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          borderColor: "rgba(245, 158, 11, 0.5)",
          boxShadow: "0 20px 40px -15px rgba(245, 158, 11, 0.25), 0 0 25px rgba(56, 189, 248, 0.15)",
        }}
      >
        {/* Top Glowing Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-500" />

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Topic Transition
                </span>
                <span className="font-mono text-xs font-bold text-sky-400">
                  {activeAlert.timeStr}
                </span>
              </div>
              <h4 className="text-sm font-bold mt-0.5 text-white">
                New Hour Beginning
              </h4>
            </div>
          </div>

          <button
            onClick={() => setActiveAlert(null)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message body */}
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {activeAlert.message}
        </p>

        {/* Scheduled Routine highlight if present */}
        {activeAlert.scheduledActivity && (
          <div className="mb-3.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center gap-2 text-xs">
            <Clock size={13} className="text-sky-400 shrink-0" />
            <span className="text-slate-400">Scheduled:</span>
            <span className="font-bold text-sky-300 truncate">{activeAlert.scheduledActivity}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {onOpenPicker && (
            <button
              onClick={() => {
                onOpenPicker();
                setActiveAlert(null);
              }}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#111",
              }}
            >
              <Dices size={14} />
              <span>Pick Next Target</span>
            </button>
          )}

          {onLogBlock && (
            <button
              onClick={() => {
                onLogBlock(previousHour);
                setActiveAlert(null);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-white/15 bg-white/10 hover:bg-white/15 text-white transition-all shrink-0"
              title={`Log hour block for ${previousHour}:00`}
            >
              <span>Log {previousHour}:00</span>
              <ArrowRight size={13} />
            </button>
          )}

          <button
            onClick={() => setActiveAlert(null)}
            className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors shrink-0"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
