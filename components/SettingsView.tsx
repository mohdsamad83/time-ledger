"use client";

import React, { useState, useEffect } from "react";
import {
  CustomCategory, DEFAULT_CATEGORIES, HourlyAlertSettings, DEFAULT_HOURLY_SETTINGS,
  HourlySoundType, RoutineItem, HourlyTimingMode
} from "@/lib/types";
import {
  Plus, Trash2, Save, RefreshCw, Settings2, Loader2, CheckCircle2,
  Bell, Palette, Timer, Database, Volume2, Play, Sparkles, Check,
  Clock, Shield, ExternalLink, Download, AlertCircle, Laptop, Calendar, ArrowUpDown
} from "lucide-react";
import { saveCategories } from "@/lib/storage";
import { useTheme, THEMES, ThemeId } from "@/lib/theme";
import { playHourlySound } from "@/lib/hourly-audio";

interface Props {
  initialCategories: CustomCategory[];
  routine?: RoutineItem[];
  onUpdate: (categories: CustomCategory[]) => void;
}

type SettingsTab = "alerts" | "categories" | "timer" | "appearance" | "backup";

const SOUND_PRESETS: { id: HourlySoundType; label: string; desc: string; icon: string }[] = [
  { id: "zen-bell", label: "Zen Bell", desc: "Tibetan bowl meditation chime (Peaceful)", icon: "🎶" },
  { id: "digital-chime", label: "Digital Chime", desc: "3-note crystal ascending chime (Crisp)", icon: "🔔" },
  { id: "soft-ping", label: "Soft Ping", desc: "Minimal acoustic tap (Subtle)", icon: "🔘" },
  { id: "executive", label: "Executive Chime", desc: "Twin-bell airport announcement (Polished)", icon: "🏛️" },
  { id: "arcade", label: "Arcade Fanfare", desc: "8-bit energetic chord (Motivating)", icon: "🕹️" },
  { id: "none", label: "Mute", desc: "Visual notification only (Silent)", icon: "🔇" },
];

const PRESET_EMOJIS = ["💼", "💻", "📚", "💤", "🌅", "🍽️", "❤️", "🍻", "🍿", "🚶", "🫠", "📱", "🏋️", "🎯", "🎨", "🧪", "✍️", "🧘", "🎵", "🚀"];

const PRESET_COLORS = [
  "#818CF8", "#60A5FA", "#34D399", "#FCD34D", "#F472B6",
  "#FB923C", "#F87171", "#38BDF8", "#A78BFA", "#A3E635"
];

export default function SettingsView({ initialCategories, routine = [], onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("alerts");
  const { theme, setTheme } = useTheme();

  // ── Categories State ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CustomCategory[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // ── Hourly Alerts State ───────────────────────────────────────────────────
  const [hourlySettings, setHourlySettings] = useState<HourlyAlertSettings>(DEFAULT_HOURLY_SETTINGS);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // ── Break Timer Settings State ────────────────────────────────────────────
  const [timerSettings, setTimerSettings] = useState({
    workDuration: "25",
    breakDuration: "5",
    alarmDuration: "15",
  });

  // Load initial settings
  useEffect(() => {
    // 1. Hourly alerts settings
    try {
      const savedAlerts = localStorage.getItem("tl-hourly-alert-settings");
      if (savedAlerts) {
        setHourlySettings({ ...DEFAULT_HOURLY_SETTINGS, ...JSON.parse(savedAlerts) });
      }
    } catch {}

    // 2. Notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // 3. Timer settings
    try {
      const savedTimer = localStorage.getItem("break-reminder-settings");
      if (savedTimer) {
        setTimerSettings(JSON.parse(savedTimer));
      }
    } catch {}
  }, []);

  // Save Hourly Alert settings
  const handleUpdateHourly = (updates: Partial<HourlyAlertSettings>) => {
    const next = { ...hourlySettings, ...updates };
    setHourlySettings(next);
    localStorage.setItem("tl-hourly-alert-settings", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("tl-hourly-settings-updated"));
  };

  // Save Timer settings
  const handleUpdateTimer = (field: string, value: string) => {
    const next = { ...timerSettings, [field]: value };
    setTimerSettings(next);
    localStorage.setItem("break-reminder-settings", JSON.stringify(next));
  };

  // Request browser desktop notification permission
  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Browser notifications are not supported in this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === "granted") {
      handleUpdateHourly({ enableDesktopNotification: true });
      new Notification("🔔 Topic Alerts Enabled!", {
        body: "Time Ledger will now notify you at the top of every hour to change topic.",
        icon: "/logo.jpg",
      });
    }
  };

  // Trigger test in-app alert (supports testing hourly or routine)
  const handleTestAlert = (testType: "hourly" | "routine" = "hourly") => {
    window.dispatchEvent(
      new CustomEvent("tl-test-hourly-alert", { detail: { settings: hourlySettings, testType } })
    );
  };

  // ── Category Actions ──────────────────────────────────────────────────────
  const handleAddCategory = () => {
    const newCat: CustomCategory = {
      value: `cat-${Date.now()}`,
      label: "New Category",
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      bg: "rgba(96, 165, 250, 0.1)",
      emoji: "🏷️",
    };
    newCat.bg = `${newCat.color}20`;
    setCategories([...categories, newCat]);
  };

  const handleUpdateCategory = (index: number, field: keyof CustomCategory, value: string) => {
    const next = [...categories];
    next[index] = { ...next[index], [field]: value };
    if (field === "color") {
      next[index].bg = `${value}20`;
    }
    setCategories(next);
  };

  const handleDeleteCategory = (index: number) => {
    if (categories.length <= 1) {
      alert("You need at least one category.");
      return;
    }
    const next = categories.filter((_, i) => i !== index);
    setCategories(next);
  };

  const handleSaveCategories = async () => {
    setIsSaving(true);
    const success = await saveCategories(categories);
    if (success) {
      onUpdate(categories);
      setSavedMsg("Categories synced to Google Sheets!");
      setTimeout(() => setSavedMsg(""), 3000);
    } else {
      alert("Failed to sync categories to Google Sheets. Check connection or try again.");
    }
    setIsSaving(false);
  };

  const handleResetCategories = () => {
    if (confirm("Reset to default categories? Click 'Save Changes' afterwards to push to Sheets.")) {
      setCategories([...DEFAULT_CATEGORIES]);
    }
  };

  // Backup export
  const handleExportBackup = () => {
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      categories,
      hourlySettings,
      timerSettings,
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-ledger-settings-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: "var(--text)" }}>
            <Settings2 className="text-sky-400" size={28} />
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--faint)" }}>
            Configure hourly topic reminders, customize time categories, set focus sprint timers and themes.
          </p>
        </div>

        {savedMsg && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold fade-up">
            <CheckCircle2 size={16} />
            <span>{savedMsg}</span>
          </div>
        )}
      </div>

      {/* ── Navigation Tab Pills ── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border mb-8 overflow-x-auto custom-scrollbar" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {(
          [
            { id: "alerts", label: "Hourly Alerts & Pacer", icon: <Bell size={16} />, badge: "NEW" },
            { id: "categories", label: "Categories", icon: <Database size={16} />, count: categories.length },
            { id: "timer", label: "Focus & Break", icon: <Timer size={16} /> },
            { id: "appearance", label: "Themes", icon: <Palette size={16} /> },
            { id: "backup", label: "Data & Backup", icon: <Shield size={16} /> },
          ] as { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string; count?: number }[]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-sky-500 text-white shadow-md scale-[1.01]"
                : "hover:bg-white/5 opacity-70 hover:opacity-100"
            }`}
            style={activeTab !== tab.id ? { color: "var(--text)" } : {}}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-black">
                {tab.badge}
              </span>
            )}
            {tab.count !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 text-white/90">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: HOURLY ALERTS & TOPIC PACER (NEW FEATURE)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "alerts" && (
        <div className="space-y-6 fade-up">
          {/* Master Toggle Card */}
          <div
            className="p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            style={{
              background: hourlySettings.enabled ? "linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)" : "var(--surface)",
              borderColor: hourlySettings.enabled ? "rgba(56, 189, 248, 0.4)" : "var(--border)",
            }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  background: hourlySettings.enabled ? "rgba(56, 189, 248, 0.2)" : "var(--s2)",
                  borderColor: hourlySettings.enabled ? "#38bdf8" : "var(--border)",
                  color: hourlySettings.enabled ? "#38bdf8" : "var(--faint)",
                }}
              >
                <Bell size={24} className={hourlySettings.enabled ? "animate-pulse" : ""} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold" style={{ color: "var(--text)" }}>
                    Hourly Topic Transition Reminder
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    Pacer Engine
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--faint)" }}>
                  Plays a subtle chime and prompts you every hour to switch topics, log progress, or review your focus.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleUpdateHourly({ enabled: !hourlySettings.enabled })}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hourlySettings.enabled ? "bg-sky-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hourlySettings.enabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Timing Cadence */}
            <div className="p-5 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Clock size={16} className="text-amber-400" />
                  Alert Timing Cadence & Schedule
                </h4>
                <span className="text-[10px] font-mono opacity-60">When to notify</span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: "top-of-hour",
                    title: "Exact Top of the Hour (:00)",
                    desc: "Fires at exactly 1:00 PM, 2:00 PM, 3:00 PM... Perfect for clean hourly ledger logging.",
                    tag: "Hourly",
                  },
                  {
                    id: "pre-hour-5",
                    title: "5 Minutes Warning (:55)",
                    desc: "Fires at 1:55 PM, 2:55 PM... Gives you 5 minutes to conclude the current block.",
                    tag: "Wrap-up",
                  },
                  {
                    id: "routine-schedule",
                    title: "📅 Routine Schedule Transitions (NEW)",
                    desc: "Alerts at the start of each activity in your Time Table routine (e.g. 7:00 AM Gym, 9:00 AM Deep Work).",
                    tag: "Routine",
                  },
                  {
                    id: "both-hourly-and-routine",
                    title: "⚡ Dual Mode (Hourly Check-in + Routine Transitions)",
                    desc: "The ultimate system: get hourly ledger pacer chimes PLUS alerts whenever your scheduled routine activity switches.",
                    tag: "Recommended",
                  },
                  {
                    id: "custom-interval",
                    title: "Custom Minute Interval",
                    desc: "Repeats every custom duration (e.g., every 30, 45, or 60 minutes).",
                    tag: "Flexible",
                  },
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleUpdateHourly({ timingMode: opt.id as HourlyTimingMode })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      hourlySettings.timingMode === opt.id
                        ? "border-sky-400 bg-sky-500/10 shadow-sm"
                        : "hover:bg-white/5 opacity-80"
                    }`}
                    style={hourlySettings.timingMode !== opt.id ? { borderColor: "var(--border)" } : {}}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{opt.title}</span>
                        {opt.tag === "Recommended" ? (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400 text-black">
                            {opt.tag}
                          </span>
                        ) : opt.tag === "Routine" ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {opt.tag}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/70">
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      {hourlySettings.timingMode === opt.id && <Check size={14} className="text-sky-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--faint)" }}>{opt.desc}</p>
                  </div>
                ))}
              </div>

              {/* Routine Schedule Lead Time & Status Card */}
              {(hourlySettings.timingMode === "routine-schedule" || hourlySettings.timingMode === "both-hourly-and-routine") && (
                <div className="p-3.5 rounded-xl border space-y-2.5 bg-emerald-500/5 border-emerald-500/30 fade-up">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Calendar size={13} /> Routine Advance Notice (Lead Time):
                    </span>
                    <span className="text-[10px] font-mono opacity-70">
                      {hourlySettings.routineLeadTimeMinutes === 0 ? "Exact time" : `${hourlySettings.routineLeadTimeMinutes}m early`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mins: 0, label: "At Start Time (0m)" },
                      { mins: 5, label: "5 mins Before" },
                      { mins: 10, label: "10 mins Before" },
                    ].map(lead => (
                      <button
                        key={lead.mins}
                        type="button"
                        onClick={() => handleUpdateHourly({ routineLeadTimeMinutes: lead.mins })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                          (hourlySettings.routineLeadTimeMinutes || 0) === lead.mins
                            ? "bg-emerald-500 text-white border-emerald-400 shadow-sm"
                            : "hover:bg-white/5 text-[var(--muted)] border-white/10"
                        }`}
                      >
                        {lead.label}
                      </button>
                    ))}
                  </div>

                  {/* Routine Status Info */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-[var(--faint)]">
                    <span>
                      📋 Time Table: <strong className="text-white">{routine?.length || 0} activities</strong> configured
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestAlert("routine")}
                      className="text-emerald-400 hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      <Sparkles size={11} /> Test Routine Chime
                    </button>
                  </div>
                </div>
              )}

              {hourlySettings.timingMode === "custom-interval" && (
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Repeat every:</span>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={hourlySettings.customIntervalMinutes || 60}
                    onChange={e => handleUpdateHourly({ customIntervalMinutes: parseInt(e.target.value) || 60 })}
                    className="w-20 px-3 py-1.5 rounded-lg border text-center font-bold text-xs"
                    style={{ background: "var(--s2)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <span className="text-xs text-[var(--faint)]">minutes</span>
                </div>
              )}
            </div>

            {/* Active Hours Window (Do Not Disturb) */}
            <div className="p-5 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Shield size={16} className="text-emerald-400" />
                  Active Window & Sleep Protection
                </h4>
                <span className="text-[10px] font-mono opacity-60">Do not disturb</span>
              </div>

              <div className="flex gap-2 p-1 rounded-xl bg-black/10 dark:bg-white/5 border" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => handleUpdateHourly({ activeWindowMode: "custom-hours" })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hourlySettings.activeWindowMode === "custom-hours" ? "bg-sky-500 text-white" : "text-[var(--muted)]"
                  }`}
                >
                  Custom Hours
                </button>
                <button
                  onClick={() => handleUpdateHourly({ activeWindowMode: "all-day" })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hourlySettings.activeWindowMode === "all-day" ? "bg-sky-500 text-white" : "text-[var(--muted)]"
                  }`}
                >
                  24/7 All Day
                </button>
              </div>

              {hourlySettings.activeWindowMode === "custom-hours" ? (
                <div className="p-4 rounded-xl border space-y-3" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Only trigger chime between these hours (keeps your sleep silent):
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                        Start Alerting
                      </label>
                      <select
                        value={hourlySettings.startHour}
                        onChange={e => handleUpdateHourly({ startHour: parseInt(e.target.value) })}
                        className="w-full text-xs font-bold rounded-lg p-2 border"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>
                            {h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                        Stop Alerting
                      </label>
                      <select
                        value={hourlySettings.endHour}
                        onChange={e => handleUpdateHourly({ endHour: parseInt(e.target.value) })}
                        className="w-full text-xs font-bold rounded-lg p-2 border"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>
                            {h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs p-3 rounded-xl border bg-black/5 dark:bg-white/5 text-[var(--faint)]" style={{ borderColor: "var(--border)" }}>
                  Alerts will trigger 24 hours a day without cutoff.
                </p>
              )}
            </div>

            {/* Sound Chime Selection with Instant Preview */}
            <div className="p-5 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Volume2 size={16} className="text-indigo-400" />
                  Alert Chime & Audio Tone
                </h4>
                <span className="text-[10px] font-mono opacity-60">Web Audio Synth</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SOUND_PRESETS.map(s => {
                  const isSelected = hourlySettings.sound === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        handleUpdateHourly({ sound: s.id });
                        playHourlySound(s.id, hourlySettings.volume);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 group ${
                        isSelected
                          ? "border-sky-400 bg-sky-500/15 shadow-sm"
                          : "hover:bg-white/5 opacity-80"
                      }`}
                      style={!isSelected ? { borderColor: "var(--border)" } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{s.icon}</span>
                        {isSelected ? (
                          <Check size={14} className="text-sky-400" />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playHourlySound(s.id, hourlySettings.volume);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-[var(--muted)]"
                            title="Preview sound"
                          >
                            <Play size={12} fill="currentColor" />
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight" style={{ color: "var(--text)" }}>
                          {s.label}
                        </div>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--faint)" }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Volume Slider */}
              <div className="pt-2 flex items-center gap-4">
                <span className="text-xs font-semibold shrink-0" style={{ color: "var(--muted)" }}>
                  Volume: {Math.round(hourlySettings.volume * 100)}%
                </span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={hourlySettings.volume}
                  onChange={e => {
                    const vol = parseFloat(e.target.value);
                    handleUpdateHourly({ volume: vol });
                  }}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <button
                  onClick={() => playHourlySound(hourlySettings.sound, hourlySettings.volume)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border hover:bg-white/10 shrink-0"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  title="Test selected sound"
                >
                  Test 🔊
                </button>
              </div>
            </div>

            {/* Message & Browser Notification Setup */}
            <div className="p-5 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Laptop size={16} className="text-purple-400" />
                  Notification Appearance
                </h4>
                <span className="text-[10px] font-mono opacity-60">Desktop & In-App</span>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                  Custom Alert Message
                </label>
                <input
                  type="text"
                  value={hourlySettings.message}
                  onChange={e => handleUpdateHourly({ message: e.target.value })}
                  placeholder="It's time to change topic! Wrap up and start next block."
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                  <span className="opacity-50">Quick Presets:</span>
                  {[
                    "Time to change topic!",
                    "Top of the hour! Review progress & switch.",
                    "Wrap up current block and log your hour.",
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleUpdateHourly({ message: p })}
                      className="px-2 py-0.5 rounded border hover:bg-white/10 text-[var(--faint)] hover:text-[var(--text)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browser Desktop Notification Status */}
              <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    Browser Desktop Notifications
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--faint)" }}>
                    {notificationPermission === "granted"
                      ? "Permission granted ✓ Alerts will display even if tab is in the background."
                      : notificationPermission === "denied"
                      ? "Permission blocked in browser settings. Please enable notifications in your browser URL bar."
                      : "Allow Time Ledger to send desktop notifications when minimized."}
                  </div>
                </div>

                {notificationPermission !== "granted" ? (
                  <button
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow-sm"
                  >
                    Enable Notifications
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    Active ✓
                  </span>
                )}
              </div>

              {/* In-app Simulator Triggers */}
              <div className="pt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleTestAlert("hourly")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border hover:bg-white/10 transition-all text-amber-400 border-amber-400/40"
                >
                  <Bell size={13} />
                  <span>Simulate Hourly Alert 🔔</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestAlert("routine")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border hover:bg-white/10 transition-all text-emerald-400 border-emerald-400/40 bg-emerald-500/10"
                >
                  <Sparkles size={13} />
                  <span>Simulate Routine Alert 📅</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: CATEGORIES MANAGEMENT (REDESIGNED)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "categories" && (
        <div className="space-y-6 fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Activity Categories ({categories.length})
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>
                Categories are assigned to your hourly blocks to classify deep work, learning, routine, and leisure.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleResetCategories}
                className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border hover:bg-white/5"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                title="Reset to default categories"
              >
                <RefreshCw size={13} />
                <span>Reset Defaults</span>
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white shadow-sm"
              >
                <Plus size={15} />
                <span>Add Category</span>
              </button>
              <button
                onClick={handleSaveCategories}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSaving ? "Saving..." : "Save to Sheets ✓"}</span>
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border flex flex-col justify-between gap-3 group transition-all hover:border-slate-500"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  {/* Emoji selector */}
                  <div className="relative">
                    <input
                      type="text"
                      value={cat.emoji}
                      onChange={e => handleUpdateCategory(i, "emoji", e.target.value)}
                      className="w-12 h-12 rounded-xl border text-center text-xl cursor-pointer flex items-center justify-center p-0"
                      style={{ background: "var(--s2)", borderColor: "var(--border)" }}
                      title="Category Emoji"
                    />
                  </div>

                  {/* Label & internal value */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={cat.label}
                      onChange={e => handleUpdateCategory(i, "label", e.target.value)}
                      placeholder="Category Name"
                      className="w-full font-bold text-sm bg-transparent border-b pb-0.5 focus:border-sky-400"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    <div className="text-[10px] font-mono opacity-50 mt-1 truncate">
                      ID: {cat.value}
                    </div>
                  </div>

                  {/* Color picker */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="color"
                      value={cat.color.startsWith("#") ? cat.color : "#60A5FA"}
                      onChange={e => handleUpdateCategory(i, "color", e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                      title="Choose category color"
                    />
                    <button
                      onClick={() => handleDeleteCategory(i)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors opacity-70 group-hover:opacity-100"
                      title="Delete category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Live Badge Preview */}
                <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: "var(--s2)" }}>
                  <span className="text-[10px] opacity-50">Timeline Block Preview:</span>
                  <span
                    className="cat-badge"
                    style={{ background: `${cat.color}22`, color: cat.color }}
                  >
                    {cat.emoji} {cat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border flex items-center justify-between text-xs" style={{ background: "var(--s2)", borderColor: "var(--border)", color: "var(--faint)" }}>
            <span>💡 Tip: Changing existing IDs may cause past block logs to display fallback styling.</span>
            <button
              onClick={handleSaveCategories}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg font-bold text-xs bg-emerald-500 text-white"
            >
              {isSaving ? "Saving..." : "Save Categories to Sheets"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: FOCUS & BREAK TIMER
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "timer" && (
        <div className="space-y-6 fade-up">
          <div className="p-5 sm:p-6 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Pomodoro Focus & Break Defaults
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>
                Configures standard intervals for the floating Break Timer tool.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border space-y-2" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Focus Duration</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={timerSettings.workDuration}
                    onChange={e => handleUpdateTimer("workDuration", e.target.value)}
                    className="w-20 px-3 py-2 rounded-lg border text-center font-bold text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <span className="text-xs text-[var(--muted)]">minutes</span>
                </div>
                <p className="text-[10px] text-[var(--faint)]">Standard deep focus sprint (default 25m).</p>
              </div>

              <div className="p-4 rounded-xl border space-y-2" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Break Duration</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={timerSettings.breakDuration}
                    onChange={e => handleUpdateTimer("breakDuration", e.target.value)}
                    className="w-20 px-3 py-2 rounded-lg border text-center font-bold text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <span className="text-xs text-[var(--muted)]">minutes</span>
                </div>
                <p className="text-[10px] text-[var(--faint)]">Rest and hydration interval (default 5m).</p>
              </div>

              <div className="p-4 rounded-xl border space-y-2" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Alarm Duration</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={timerSettings.alarmDuration}
                    onChange={e => handleUpdateTimer("alarmDuration", e.target.value)}
                    className="w-20 px-3 py-2 rounded-lg border text-center font-bold text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <span className="text-xs text-[var(--muted)]">seconds</span>
                </div>
                <p className="text-[10px] text-[var(--faint)]">How long the timer beeps when phase ends.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: APPEARANCE & THEMES
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "appearance" && (
        <div className="space-y-6 fade-up">
          <div className="p-5 sm:p-6 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Color Palette & Visual Theme
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>
                Select your preferred visual style. Changes apply across the entire application.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {THEMES.map(t => {
                const isSelected = theme === t.id;
                const isSpeedster = t.id === "speedster";

                return (
                  <div
                    key={t.id}
                    onClick={() => setTheme(t.id as ThemeId)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg scale-[1.02]"
                        : "hover:bg-white/5 opacity-80"
                    }`}
                    style={!isSelected ? { borderColor: "var(--border)" } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{t.icon}</span>
                      {isSelected ? (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-black"
                          style={{ background: isSpeedster ? "#8ae3b5" : "var(--primary)" }}
                        >
                          Active ✓
                        </span>
                      ) : isSpeedster ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                          NEW
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm" style={{ color: "var(--text)" }}>{t.label}</h4>
                      </div>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--faint)" }}>{t.description}</p>
                    </div>

                    {/* Multi-tone Color Palette Preview Swatch */}
                    <div className="h-2.5 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
                      {t.id === "speedster" ? (
                        <>
                          <div className="w-1/3" style={{ background: "#080c0a" }} title="Matte Obsidian Black" />
                          <div className="w-1/3" style={{ background: "#8ae3b5" }} title="Porsche Mint Green" />
                          <div className="w-1/3" style={{ background: "#ea2839" }} title="Racing Crimson Red" />
                        </>
                      ) : t.id === "light" ? (
                        <>
                          <div className="w-1/3" style={{ background: "#f3f4f6" }} />
                          <div className="w-1/3" style={{ background: "#3b82f6" }} />
                          <div className="w-1/3" style={{ background: "#111827" }} />
                        </>
                      ) : t.id === "midnight" ? (
                        <>
                          <div className="w-1/3" style={{ background: "#060B18" }} />
                          <div className="w-1/3" style={{ background: "#60A5FA" }} />
                          <div className="w-1/3" style={{ background: "#E2EEFF" }} />
                        </>
                      ) : (
                        <>
                          <div className="w-1/3" style={{ background: "#0f172a" }} />
                          <div className="w-1/3" style={{ background: "#38bdf8" }} />
                          <div className="w-1/3" style={{ background: "#f8fafc" }} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5: DATA, SHEETS & BACKUP
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "backup" && (
        <div className="space-y-6 fade-up">
          <div className="p-5 sm:p-6 rounded-2xl border space-y-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Google Sheets Integration & Diagnostics
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>
                Time Ledger synchronizes all daily setups, hourly logs, targets, and reviews directly to your connected Google Sheet.
              </p>
            </div>

            <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  📊
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--text)" }}>Google Sheet Connected</div>
                  <div className="text-[11px] font-mono opacity-60">Ready for automated two-way synchronization</div>
                </div>
              </div>

              {process.env.NEXT_PUBLIC_SHEET_URL && (
                <a
                  href={process.env.NEXT_PUBLIC_SHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white shadow-sm shrink-0"
                >
                  <ExternalLink size={14} />
                  <span>Open Spreadsheet</span>
                </a>
              )}
            </div>

            {/* Local Data Export */}
            <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--text)" }}>Export Configuration & Settings</div>
                <div className="text-[11px]" style={{ color: "var(--faint)" }}>
                  Download a JSON backup of your custom categories, timer preferences, and hourly alert triggers.
                </div>
              </div>

              <button
                onClick={handleExportBackup}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border hover:bg-white/10 shrink-0"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <Download size={14} />
                <span>Export JSON Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
