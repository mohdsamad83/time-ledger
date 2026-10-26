"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  Bell, X, Dices, ArrowRight, Clock, Volume2, Sparkles, CheckCircle2, Calendar
} from "lucide-react";
import { HourlyAlertSettings, DEFAULT_HOURLY_SETTINGS, RoutineItem } from "@/lib/types";
import { playHourlySound } from "@/lib/hourly-audio";

interface Props {
  routine?: RoutineItem[];
  onOpenPicker?: () => void;
  onLogBlock?: (hour: number) => void;
}

interface AlertTriggerInfo {
  type: "routine" | "hourly" | "custom";
  routineItem?: RoutineItem;
  leadMinutes?: number;
}

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hrStr, minStr] = time24.split(":");
  let hr = parseInt(hrStr, 10);
  if (isNaN(hr)) return time24;
  const period = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${hr}:${minStr || "00"} ${period}`;
}

export default function HourlyReminderAlert({ routine = [], onOpenPicker, onLogBlock }: Props) {
  // Initialize state once from localStorage
  const [settings, setSettings] = useState<HourlyAlertSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_HOURLY_SETTINGS;
    try {
      const saved = localStorage.getItem("tl-hourly-alert-settings");
      if (saved) {
        return { ...DEFAULT_HOURLY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_HOURLY_SETTINGS;
  });

  const [activeAlert, setActiveAlert] = useState<{
    timeStr: string;
    hour: number;
    message: string;
    alertType: "routine" | "hourly" | "custom";
    scheduledActivity?: string;
    routineSpan?: string;
  } | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertKeyRef = useRef<string | null>(null);

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
  const triggerAlert = useCallback((
    now: Date, 
    overrideCfg?: HourlyAlertSettings, 
    isTest: boolean = false, 
    info?: AlertTriggerInfo
  ) => {
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

    const alertType = info?.type || "hourly";
    let scheduledActivity: string | undefined = info?.routineItem?.activity;
    let routineSpan: string | undefined = undefined;

    if (info?.routineItem) {
      routineSpan = `${format12Hour(info.routineItem.startTime)} – ${format12Hour(info.routineItem.endTime)}`;
    }

    // If not supplied, search current routine for active hour
    if (!scheduledActivity) {
      const nowMinutes = currentHour * 60 + now.getMinutes();
      const routineList = routineRef.current || [];
      for (const item of routineList) {
        if (!item.startTime || !item.endTime) continue;
        const [sHr, sMin] = item.startTime.split(":").map(Number);
        const [eHr, eMin] = item.endTime.split(":").map(Number);
        const start = sHr * 60 + (sMin || 0);
        const end = eHr * 60 + (eMin || 0);
        if (start <= end) {
          if (nowMinutes >= start && nowMinutes < end) {
            scheduledActivity = item.activity;
            routineSpan = `${format12Hour(item.startTime)} – ${format12Hour(item.endTime)}`;
          }
        } else {
          if (nowMinutes >= start || nowMinutes < end) {
            scheduledActivity = item.activity;
            routineSpan = `${format12Hour(item.startTime)} – ${format12Hour(item.endTime)}`;
          }
        }
      }
    }

    // Play synthesized audio tone
    playHourlySound(cfg.sound, cfg.volume);

    // Formulate title & message
    let alertMessage = cfg.message || "Time to change topic! Wrap up your previous block and transition.";
    if (alertType === "routine" && info?.routineItem) {
      const lead = info.leadMinutes || 0;
      if (lead > 0) {
        alertMessage = `Upcoming in ${lead} mins: "${info.routineItem.activity}" (${routineSpan}). Wrap up current work!`;
      } else {
        alertMessage = `Scheduled routine "${info.routineItem.activity}" (${routineSpan}) is starting now!`;
      }
    }

    // Show in-app banner alert
    setActiveAlert({
      timeStr: formattedTime,
      hour: currentHour,
      message: alertMessage,
      alertType,
      scheduledActivity,
      routineSpan,
    });

    // Send Browser Desktop Notification if enabled and permitted
    if (cfg.enableDesktopNotification && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const title = alertType === "routine" && scheduledActivity
            ? `🔔 Routine: ${scheduledActivity} (${formattedTime})`
            : `🔔 ${formattedTime} — Time to Change Topic!`;

          const notif = new Notification(title, {
            body: alertMessage,
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

    lastAlertKeyRef.current = `${formattedTime}-${alertType}-${scheduledActivity || ""}`;
  }, []);

  // Window events listener
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
      const customEvent = e as CustomEvent<{ settings?: HourlyAlertSettings; testType?: "routine" | "hourly" }>;
      const testSettings = customEvent.detail?.settings || settingsRef.current;
      const testType = customEvent.detail?.testType || "hourly";
      
      const sampleItem = routineRef.current.find(r => r.activity) || {
        activity: "Deep Work Focus Block",
        startTime: "09:00",
        endTime: "11:30"
      };

      triggerAlert(
        new Date(), 
        testSettings, 
        true, 
        testType === "routine" ? { type: "routine", routineItem: sampleItem, leadMinutes: testSettings.routineLeadTimeMinutes || 0 } : { type: "hourly" }
      );
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

  // Scheduler logic — recalculates when schedule parameters or routine changes
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
      const currentTimingMode = settings.timingMode;
      const routineList = routineRef.current || [];
      const leadMinutes = settings.routineLeadTimeMinutes || 0;

      const checkRoutine = 
        currentTimingMode === "routine-schedule" || 
        currentTimingMode === "both-hourly-and-routine" || 
        !!settings.notifyOnRoutine;

      let nextRoutineTime: Date | null = null;
      let nextRoutineItem: RoutineItem | null = null;

      if (checkRoutine && routineList.length > 0) {
        let smallestRoutineDiff = Infinity;

        for (const item of routineList) {
          if (!item.startTime) continue;
          const [sHr, sMin] = item.startTime.split(":").map(Number);
          if (isNaN(sHr)) continue;

          let triggerMinutes = sHr * 60 + (sMin || 0) - leadMinutes;
          if (triggerMinutes < 0) {
            triggerMinutes += 24 * 60;
          }

          const target = new Date(now);
          target.setHours(Math.floor(triggerMinutes / 60), triggerMinutes % 60, 0, 0);

          // If time has passed today, target tomorrow
          if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
          }

          const diff = target.getTime() - now.getTime();
          if (diff > 0 && diff < smallestRoutineDiff) {
            smallestRoutineDiff = diff;
            nextRoutineTime = target;
            nextRoutineItem = item;
          }
        }
      }

      // Check hourly cadence
      let nextHourlyTime: Date | null = null;
      const checkHourly = 
        currentTimingMode === "top-of-hour" || 
        currentTimingMode === "pre-hour-5" || 
        currentTimingMode === "custom-interval" || 
        currentTimingMode === "both-hourly-and-routine" ||
        (!checkRoutine); // Fallback if no routine is defined

      if (checkHourly) {
        const target = new Date(now);
        if (currentTimingMode === "pre-hour-5") {
          if (now.getMinutes() < 55) {
            target.setMinutes(55, 0, 0);
          } else {
            target.setHours(now.getHours() + 1, 55, 0, 0);
          }
        } else if (currentTimingMode === "custom-interval") {
          const intervalMs = Math.max(5, settings.customIntervalMinutes || 60) * 60 * 1000;
          target.setTime(now.getTime() + intervalMs);
        } else {
          // top-of-hour default
          target.setHours(now.getHours() + 1, 0, 0, 0);
        }
        nextHourlyTime = target;
      }

      // Decide earliest target
      let chosenTarget: Date;
      let alertInfo: AlertTriggerInfo;

      if (nextRoutineTime && nextHourlyTime) {
        if (nextRoutineTime.getTime() <= nextHourlyTime.getTime()) {
          chosenTarget = nextRoutineTime;
          alertInfo = { type: "routine", routineItem: nextRoutineItem!, leadMinutes };
        } else {
          chosenTarget = nextHourlyTime;
          alertInfo = { type: "hourly" };
        }
      } else if (nextRoutineTime) {
        chosenTarget = nextRoutineTime;
        alertInfo = { type: "routine", routineItem: nextRoutineItem!, leadMinutes };
      } else if (nextHourlyTime) {
        chosenTarget = nextHourlyTime;
        alertInfo = { type: "hourly" };
      } else {
        chosenTarget = new Date(now);
        chosenTarget.setHours(now.getHours() + 1, 0, 0, 0);
        alertInfo = { type: "hourly" };
      }

      const delayMs = Math.max(1000, chosenTarget.getTime() - now.getTime());

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        triggerAlert(new Date(), undefined, false, alertInfo);
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();

    // 30s watchdog for system sleep/wake recovery
    const watchdog = setInterval(() => {
      const now = new Date();
      const currentMin = now.getMinutes();
      const currentHour = now.getHours();

      if (settingsRef.current.timingMode === "top-of-hour" && currentMin === 0) {
        const key = `${currentHour}:00-hourly`;
        if (lastAlertKeyRef.current !== key) {
          triggerAlert(now, undefined, false, { type: "hourly" });
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
    settings.routineLeadTimeMinutes,
    settings.notifyOnRoutine,
    settings.startHour,
    settings.endHour,
    settings.activeWindowMode,
    routine,
    triggerAlert
  ]);

  // Auto-dismiss alert after 40 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 40000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const previousHour = (activeAlert.hour - 1 + 24) % 24;
  const isRoutine = activeAlert.alertType === "routine";

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-md w-[calc(100vw-32px)] fade-up select-none">
      <div
        className="rounded-2xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl"
        style={{
          background: isRoutine
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.98) 100%)"
            : "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          borderColor: isRoutine ? "rgba(16, 185, 129, 0.6)" : "rgba(245, 158, 11, 0.5)",
          boxShadow: isRoutine
            ? "0 20px 40px -15px rgba(16, 185, 129, 0.3), 0 0 25px rgba(56, 189, 248, 0.2)"
            : "0 20px 40px -15px rgba(245, 158, 11, 0.25), 0 0 25px rgba(56, 189, 248, 0.15)",
        }}
      >
        {/* Top Glowing Gradient Accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-1" 
          style={{
            background: isRoutine
              ? "linear-gradient(90deg, #10b981 0%, #38bdf8 50%, #6366f1 100%)"
              : "linear-gradient(90deg, #f59e0b 0%, #38bdf8 50%, #6366f1 100%)",
          }}
        />

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div 
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isRoutine 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}
            >
              {isRoutine ? <Calendar size={18} className="animate-bounce" /> : <Bell size={18} className="animate-bounce" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    isRoutine 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {isRoutine ? "Routine Transition" : "Topic Transition"}
                </span>
                <span className="font-mono text-xs font-bold text-sky-400">
                  {activeAlert.timeStr}
                </span>
              </div>
              <h4 className="text-sm font-bold mt-0.5 text-white">
                {isRoutine && activeAlert.scheduledActivity 
                  ? activeAlert.scheduledActivity 
                  : "New Hour Beginning"}
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

        {/* Scheduled Routine / Time span highlight */}
        {activeAlert.routineSpan && (
          <div className="mb-3.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-sky-400 shrink-0" />
              <span className="text-slate-400">Schedule:</span>
              <span className="font-bold text-sky-300 truncate">
                {activeAlert.scheduledActivity || "Block"}
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-400">
              {activeAlert.routineSpan}
            </span>
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
                background: isRoutine
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
