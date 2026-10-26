"use client";

import { useState, useEffect, useMemo } from "react";
import { RoutineItem, HourlyAlertSettings, DEFAULT_HOURLY_SETTINGS } from "@/lib/types";
import {
  Clock, Plus, Save, Trash2, ArrowUpDown, Bell, Sparkles, CheckCircle2,
  AlertTriangle, Coffee, Play, Check, ChevronDown, ChevronUp
} from "lucide-react";

interface Props {
  routine: RoutineItem[];
  onSave: (routine: RoutineItem[]) => Promise<void>;
  onGoToSettings?: () => void;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 99999;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h)) return 99999;
  return h * 60 + (m || 0);
}

export function sortRoutineByTime(items: RoutineItem[]): RoutineItem[] {
  return [...items].sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;

    const aEnd = timeToMinutes(a.endTime);
    const bEnd = timeToMinutes(b.endTime);
    return aEnd - bEnd;
  });
}

function calculateDuration(start: string, end: string): string {
  if (!start || !end) return "0 hr";
  
  const [startHr, startMin] = start.split(":").map(Number);
  const [endHr, endMin] = end.split(":").map(Number);
  
  if (isNaN(startHr) || isNaN(endHr)) return "0 hr";

  let startTotal = startHr * 60 + (startMin || 0);
  let endTotal = endHr * 60 + (endMin || 0);
  
  // Handle overnight shift (e.g. 22:00 to 05:30)
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  
  const diffMins = endTotal - startTotal;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (diffMins <= 0) return "0 min";
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
  if (mins === 30) return `${hrs} ½ hr`;
  return `${hrs}h ${mins}m`;
}

function calculateDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startHr, startMin] = start.split(":").map(Number);
  const [endHr, endMin] = end.split(":").map(Number);
  if (isNaN(startHr) || isNaN(endHr)) return 0;
  let startTotal = startHr * 60 + (startMin || 0);
  let endTotal = endHr * 60 + (endMin || 0);
  if (endTotal < startTotal) endTotal += 24 * 60;
  return Math.max(0, endTotal - startTotal);
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

export default function RoutineView({ routine: initialRoutine, onSave, onGoToSettings }: Props) {
  // Always start with sorted routine for consistency
  const [routine, setRoutine] = useState<RoutineItem[]>(() => sortRoutineByTime(initialRoutine || []));
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [autoSortEnabled, setAutoSortEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Hourly / Routine notification setting state
  const [alertSettings, setAlertSettings] = useState<HourlyAlertSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_HOURLY_SETTINGS;
    try {
      const saved = localStorage.getItem("tl-hourly-alert-settings");
      if (saved) return { ...DEFAULT_HOURLY_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_HOURLY_SETTINGS;
  });

  // Keep live time ticking every 30 seconds for active activity highlight
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Update routine if initialRoutine prop changes externally
  useEffect(() => {
    if (initialRoutine) {
      setRoutine(sortRoutineByTime(initialRoutine));
    }
  }, [initialRoutine]);

  // Listen to alert settings updates from Settings tab
  useEffect(() => {
    const syncAlerts = () => {
      try {
        const saved = localStorage.getItem("tl-hourly-alert-settings");
        if (saved) setAlertSettings({ ...DEFAULT_HOURLY_SETTINGS, ...JSON.parse(saved) });
      } catch {
        // ignore
      }
    };
    window.addEventListener("tl-hourly-settings-updated", syncAlerts);
    window.addEventListener("storage", syncAlerts);
    return () => {
      window.removeEventListener("tl-hourly-settings-updated", syncAlerts);
      window.removeEventListener("storage", syncAlerts);
    };
  }, []);

  // Toggle routine notification mode directly from Routine page
  const handleToggleRoutineNotifications = () => {
    const isCurrentlyRoutine = 
      alertSettings.enabled && 
      (alertSettings.timingMode === "routine-schedule" || alertSettings.timingMode === "both-hourly-and-routine" || alertSettings.notifyOnRoutine);

    let nextSettings: HourlyAlertSettings;
    if (isCurrentlyRoutine) {
      // Switch back to standard top-of-hour
      nextSettings = {
        ...alertSettings,
        timingMode: "top-of-hour",
        notifyOnRoutine: false,
      };
      setStatusMessage("Switched to hourly top-of-hour alerts.");
    } else {
      // Enable routine schedule transitions
      nextSettings = {
        ...alertSettings,
        enabled: true,
        timingMode: "both-hourly-and-routine",
        notifyOnRoutine: true,
      };
      setStatusMessage("🔔 Routine Notifications Activated! You'll be alerted at each scheduled activity transition.");
    }

    setAlertSettings(nextSettings);
    try {
      localStorage.setItem("tl-hourly-alert-settings", JSON.stringify(nextSettings));
      window.dispatchEvent(new CustomEvent("tl-hourly-settings-updated"));
    } catch {
      // ignore
    }
    setTimeout(() => setStatusMessage(""), 4500);
  };

  const handleAdd = () => {
    const newItem: RoutineItem = { activity: "", startTime: "", endTime: "" };
    setRoutine(prev => [...prev, newItem]);
  };

  const handleRemove = (index: number) => {
    setRoutine(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof RoutineItem, value: string) => {
    setRoutine(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Auto-sort when time field finishes editing (onBlur)
  const handleTimeBlur = () => {
    if (!autoSortEnabled) return;
    setRoutine(prev => {
      const sorted = sortRoutineByTime(prev);
      return sorted;
    });
  };

  const handleManualSort = () => {
    const sorted = sortRoutineByTime(routine);
    setRoutine(sorted);
    setStatusMessage("✨ Sorted chronologically by start time!");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Automatic sorting every time the user saves/updates the routine
    const sorted = sortRoutineByTime(routine);
    setRoutine(sorted);
    await onSave(sorted);
    setIsSaving(false);
    setStatusMessage("✓ Routine auto-sorted by timings and saved successfully!");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  // Determine current active activity & next upcoming activity
  const { currentActivityIndex, nextActivityIndex, totalPlannedMins } = useMemo(() => {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    let currIdx = -1;
    let nextIdx = -1;
    let minDiffToNext = Infinity;
    let totalMins = 0;

    routine.forEach((item, idx) => {
      if (!item.startTime || !item.endTime) return;
      const sMins = timeToMinutes(item.startTime);
      const eMins = timeToMinutes(item.endTime);
      totalMins += calculateDurationMinutes(item.startTime, item.endTime);

      // Check if current
      if (sMins <= eMins) {
        if (currentMins >= sMins && currentMins < eMins) {
          currIdx = idx;
        }
      } else {
        // spans midnight
        if (currentMins >= sMins || currentMins < eMins) {
          currIdx = idx;
        }
      }

      // Check upcoming
      let diff = sMins - currentMins;
      if (diff < 0) diff += 24 * 60; // Next day
      if (diff > 0 && diff < minDiffToNext) {
        minDiffToNext = diff;
        nextIdx = idx;
      }
    });

    return {
      currentActivityIndex: currIdx,
      nextActivityIndex: nextIdx,
      totalPlannedMins: totalMins,
    };
  }, [routine, currentTime]);

  const activeRoutineAlerts = 
    alertSettings.enabled && 
    (alertSettings.timingMode === "routine-schedule" || alertSettings.timingMode === "both-hourly-and-routine" || alertSettings.notifyOnRoutine);

  const totalHoursStr = `${Math.floor(totalPlannedMins / 60)}h ${totalPlannedMins % 60}m`;
  const freeHoursMins = Math.max(0, 24 * 60 - totalPlannedMins);
  const freeHoursStr = `${Math.floor(freeHoursMins / 60)}h ${freeHoursMins % 60}m`;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 style={{ color: "var(--text)" }} className="font-serif text-3xl font-black tracking-tight">
              Time Table & Routine
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ArrowUpDown size={12} /> Auto-Sorted
            </span>
          </div>
          <p style={{ color: "var(--faint)" }} className="text-xs sm:text-sm mt-1">
            Design your ideal daily routine. Activities automatically sort chronologically by time as you edit and save.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleManualSort}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border hover:bg-white/5 transition-all text-sky-400 border-sky-400/30"
            title="Sort routine chronologically right now"
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">Sort by Time</span>
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isSaving ? "Saving..." : "Save Routine"}
            <Save size={16} />
          </button>
        </div>
      </div>

      {/* ── Status Toast ── */}
      {statusMessage && (
        <div className="mb-6 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold fade-up bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── Routine Notification Bridge Banner ── */}
      <div 
        className="p-4 sm:p-5 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md transition-all"
        style={{
          background: activeRoutineAlerts 
            ? "linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)"
            : "var(--surface)",
          borderColor: activeRoutineAlerts ? "rgba(56, 189, 248, 0.4)" : "var(--border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: activeRoutineAlerts ? "rgba(56, 189, 248, 0.2)" : "var(--s2)",
              borderColor: activeRoutineAlerts ? "#38bdf8" : "var(--border)",
              color: activeRoutineAlerts ? "#38bdf8" : "var(--faint)",
            }}
          >
            <Bell size={20} className={activeRoutineAlerts ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold" style={{ color: "var(--text)" }}>
                Routine Transition Notifications
              </span>
              <span 
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  activeRoutineAlerts 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }`}
              >
                {activeRoutineAlerts ? "Active & Syncing" : "Off"}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>
              {activeRoutineAlerts
                ? "You will receive audio chimes and notifications at the exact start of every routine activity."
                : "Want to get notified when it's time for each activity? Turn on routine schedule notifications."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleToggleRoutineNotifications}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              activeRoutineAlerts 
                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40" 
                : "bg-sky-500 hover:bg-sky-600 text-white"
            }`}
          >
            <Bell size={13} />
            <span>{activeRoutineAlerts ? "Routine Alerts ON ✓" : "Enable Routine Alerts"}</span>
          </button>
        </div>
      </div>

      {/* ── Live Active Now Card (if current time falls into a routine item) ── */}
      {currentActivityIndex !== -1 && routine[currentActivityIndex] && (
        <div 
          className="p-4 sm:p-5 rounded-2xl border mb-6 relative overflow-hidden backdrop-blur-md shadow-lg"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)",
            borderColor: "rgba(16, 185, 129, 0.4)",
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 block">
                  Active Routine Right Now
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  {routine[currentActivityIndex].activity || "Unspecified Block"}
                  <span className="text-xs font-mono font-normal opacity-70">
                    ({format12Hour(routine[currentActivityIndex].startTime)} – {format12Hour(routine[currentActivityIndex].endTime)})
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                Duration: {calculateDuration(routine[currentActivityIndex].startTime, routine[currentActivityIndex].endTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Routine Analytics Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-60">Total Activities</span>
          <span className="text-lg font-black" style={{ color: "var(--text)" }}>{routine.length}</span>
        </div>
        <div className="p-3.5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-60">Planned Time</span>
          <span className="text-lg font-black text-sky-400">{totalHoursStr}</span>
        </div>
        <div className="p-3.5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-60">Free / Buffer Time</span>
          <span className="text-lg font-black text-amber-400">{freeHoursStr}</span>
        </div>
        <div className="p-3.5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-60">Next Scheduled</span>
          <span className="text-xs font-bold text-indigo-300 truncate block mt-1">
            {nextActivityIndex !== -1 && routine[nextActivityIndex] 
              ? `${format12Hour(routine[nextActivityIndex].startTime)} • ${routine[nextActivityIndex].activity || "Activity"}`
              : "None pending"}
          </span>
        </div>
      </div>

      {/* ── Routine Table Card ── */}
      <div className="bg-white/5 rounded-2xl p-5 sm:p-6" style={{ border: "1px solid var(--border)" }}>
        {routine.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto mb-4 opacity-20 text-[var(--text)]" />
            <p className="text-[var(--text)] font-medium mb-2">No routine defined</p>
            <p className="text-[var(--faint)] text-sm mb-6">Create your ideal daily schedule. It will automatically order by timings.</p>
            <button onClick={handleAdd} className="btn-primary px-4 py-2 rounded-xl text-sm font-bold">
              + Add First Activity
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header Row */}
            <div className="hidden md:flex gap-4 px-3 pb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>
              <div className="w-10 text-center">#</div>
              <div className="flex-[3]">Activity Name</div>
              <div className="flex-[2]">Start Time</div>
              <div className="flex-[2]">End Time</div>
              <div className="flex-[1.5] text-center">Duration</div>
              <div className="w-10"></div>
            </div>

            {routine.map((item, idx) => {
              const isCurrent = idx === currentActivityIndex;
              const isNext = idx === nextActivityIndex && !isCurrent;
              const formattedSpan = item.startTime && item.endTime 
                ? `${format12Hour(item.startTime)} – ${format12Hour(item.endTime)}`
                : null;

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center p-3.5 rounded-xl transition-all relative ${
                    isCurrent 
                      ? "ring-2 ring-emerald-500/80 bg-emerald-500/10 shadow-md" 
                      : isNext 
                      ? "border-sky-500/40 bg-sky-500/5"
                      : "hover:bg-white/5"
                  }`} 
                  style={{ 
                    background: isCurrent ? undefined : "var(--s2)", 
                    border: isCurrent ? "1px solid #10b981" : "1px solid var(--border)" 
                  }}
                >
                  {/* Order Index & Status Tag */}
                  <div className="hidden md:flex flex-col items-center justify-center w-10 text-xs font-mono font-bold opacity-60">
                    {idx + 1}
                  </div>

                  {/* Activity Name */}
                  <div className="w-full md:flex-[3]">
                    <div className="flex items-center gap-2 mb-1 md:hidden">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/70">#{idx + 1}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          Active Now
                        </span>
                      )}
                      {isNext && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                          Next Up
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.activity}
                      onChange={(e) => handleChange(idx, "activity", e.target.value)}
                      placeholder="e.g., Morning Workout, Deep Work, Review"
                      className="w-full bg-transparent outline-none font-bold placeholder:font-normal text-sm sm:text-base"
                      style={{ color: "var(--text)" }}
                    />
                    {formattedSpan && (
                      <span className="text-[11px] font-mono block opacity-50 mt-0.5">
                        {formattedSpan}
                      </span>
                    )}
                  </div>

                  {/* Start Time */}
                  <div className="w-full md:flex-[2] flex items-center gap-2">
                    <span className="md:hidden text-xs text-[var(--faint)] w-14 shrink-0">Start:</span>
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => handleChange(idx, "startTime", e.target.value)}
                      onBlur={handleTimeBlur}
                      className="bg-black/20 px-3 py-1.5 rounded-lg border outline-none w-full font-mono text-sm focus:border-sky-400 transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  </div>

                  {/* End Time */}
                  <div className="w-full md:flex-[2] flex items-center gap-2">
                    <span className="md:hidden text-xs text-[var(--faint)] w-14 shrink-0">End:</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => handleChange(idx, "endTime", e.target.value)}
                      onBlur={handleTimeBlur}
                      className="bg-black/20 px-3 py-1.5 rounded-lg border outline-none w-full font-mono text-sm focus:border-sky-400 transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  </div>

                  {/* Duration badge */}
                  <div className="w-full md:flex-[1.5] flex items-center justify-between md:justify-center">
                    <span className="md:hidden text-xs text-[var(--faint)]">Duration:</span>
                    <span className="font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded-md bg-white/5" style={{ color: "var(--primary)" }}>
                      {calculateDuration(item.startTime, item.endTime)}
                    </span>
                  </div>

                  {/* Delete button */}
                  <div className="flex items-center justify-end md:w-10">
                    <button 
                      onClick={() => handleRemove(idx)}
                      className="p-2 rounded-lg hover:bg-red-500/15 text-red-400/50 hover:text-red-400 transition-colors"
                      title="Remove activity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add Activity Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={handleAdd}
                className="w-full sm:flex-1 py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-all hover:bg-white/5 hover:border-sky-400 text-sky-400"
                style={{ borderColor: "var(--border)" }}
              >
                <Plus size={16} /> Add Activity Row
              </button>

              <button
                onClick={handleManualSort}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold opacity-80 hover:opacity-100 hover:bg-white/5"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <ArrowUpDown size={14} /> Sort Timing Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Guidance Note ── */}
      {routine.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span style={{ color: "var(--muted)" }}>
              Auto-sort is active: activities sort automatically when saving or editing times.
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--faint)] shrink-0 hidden sm:inline">
            24-Hour Chronological Flow
          </span>
        </div>
      )}
    </div>
  );
}
