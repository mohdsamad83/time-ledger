"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  format, getDaysInMonth, startOfMonth, addMonths, subMonths,
  isSameMonth, isBefore, isAfter, differenceInDays
} from "date-fns";
import { AppData, TargetMeta } from "@/lib/types";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  ChevronLeft, ChevronRight, Target, X, ChevronDown, ChevronUp,
  Trophy, CheckCircle2, Flag, Dices, RotateCcw, Search,
  ArrowUp, Sparkles, Filter, Check, Layers, Undo2
} from "lucide-react";
import { playHourlySound } from "@/lib/hourly-audio";

interface Props {
  data: AppData;
  onToggle: (date: string, targetName: string) => void;
  onUpdateTargets?: (monthlyTargets: Record<string, TargetMeta[]>) => void;
  onOpenPicker?: () => void;
}

type ActiveFilter = "all" | "pending-today" | "done-today";
type TargetSortOrder = "default" | "percent-desc" | "percent-asc" | "alpha";

interface RowStat {
  targetMeta: TargetMeta;
  completed: number;
  percent: number;
  expected: string;
  targetElapsedDays: number;
  isAccomplished: boolean;
  accomplishedDay: number;
  targetDeadline?: string;
  challengeStartDate?: string;
  rowBg: string;
}

export default function TargetsTracker({ data, onToggle, onUpdateTargets, onOpenPicker }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isEditing, setIsEditing] = useState(false);
  const [localTargets, setLocalTargets] = useState<TargetMeta[]>([]);
  const [newTarget, setNewTarget] = useState("");
  const [rewardTarget, setRewardTarget] = useState("");

  // Search & Filters for Active targets
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortOrder, setSortOrder] = useState<TargetSortOrder>("default");
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{ targetMeta: TargetMeta; name: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Confetti Canvas reference
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStr = format(currentMonth, "yyyy-MM");
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  useEffect(() => {
    const saved = localStorage.getItem(`reward_target_${monthStr}`);
    setRewardTarget(saved || "");
  }, [monthStr]);

  // Trigger celebration confetti
  const triggerConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#38bdf8", "#fbbf24"];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; rotation: number; vRot: number; alpha: number;
    }[] = [];

    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * 0.45;

    for (let i = 0; i < 65; i++) {
      const angle = (Math.PI * 2 * i) / 65 + (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 8;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }

    const start = performance.now();
    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.rotation += p.vRot;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (time - start < 1600) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  // Calculate currentMonthlyTargets (aggregate unachieved targets from past + current month targets)
  let currentMonthlyTargets: TargetMeta[] = [];
  if (data.monthlyTargets) {
    const targetMap = new Map<string, TargetMeta>();
    const viewedMonthStart = startOfMonth(currentMonth);

    Object.keys(data.monthlyTargets).sort().forEach(m => {
      if (m <= monthStr) {
        for (const t of data.monthlyTargets![m]) {
          if (t.accomplishedAt === "dropped") {
            targetMap.delete(t.name);
            continue;
          }
          if (t.accomplishedAt) {
            const accDate = new Date(t.accomplishedAt);
            if (isBefore(accDate, viewedMonthStart)) continue;
          }
          targetMap.set(t.name, t);
        }
      }
    });
    currentMonthlyTargets = Array.from(targetMap.values());
  } else if (data.targets && data.targets.length > 0) {
    currentMonthlyTargets = data.targets.map(t => ({ name: t }));
  }

  useEffect(() => {
    if (isEditing) {
      setLocalTargets([...currentMonthlyTargets]);
    }
  }, [isEditing, monthStr, data.monthlyTargets, data.targets]);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${monthStr}-${d.toString().padStart(2, "0")}`;
  });

  // Toggle Accomplished state (move down to completed or restore back to active)
  const handleAccomplishToggle = (target: TargetMeta) => {
    if (!onUpdateTargets) return;

    const newMap: Record<string, TargetMeta[]> = data.monthlyTargets ? { ...data.monthlyTargets } : {};
    if (!newMap[monthStr]) {
      newMap[monthStr] = currentMonthlyTargets.map(t => ({ ...t }));
    }

    let updated = false;
    let willAccomplish = false;

    Object.keys(newMap).forEach(m => {
      newMap[m] = newMap[m].map(t => {
        if (t.name === target.name && !updated) {
          updated = true;
          if (t.accomplishedAt) {
            // Un-accomplish / Move back to top
            willAccomplish = false;
            return { ...t, accomplishedAt: null };
          } else {
            // Accomplish / Move down to completed card
            willAccomplish = true;
            const accomplishDate = isSameMonth(currentMonth, now)
              ? format(now, "yyyy-MM-dd")
              : `${monthStr}-${daysInMonth.toString().padStart(2, "0")}`;
            return { ...t, accomplishedAt: accomplishDate };
          }
        }
        return t;
      });
    });

    if (!updated) {
      // Add explicitly if only implicitly carried over
      willAccomplish = true;
      const accomplishDate = isSameMonth(currentMonth, now)
        ? format(now, "yyyy-MM-dd")
        : `${monthStr}-${daysInMonth.toString().padStart(2, "0")}`;
      if (!newMap[monthStr]) newMap[monthStr] = [];
      newMap[monthStr] = [
        ...newMap[monthStr],
        { name: target.name, accomplishedAt: accomplishDate, createdAt: target.createdAt }
      ];
    }

    onUpdateTargets(newMap);

    // Audio chime & celebration
    if (willAccomplish) {
      playHourlySound("arcade", 0.65);
      triggerConfetti();

      // Show floating Undo toast
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setUndoToast({ targetMeta: target, name: target.name });
      toastTimeoutRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 7000);
    } else {
      playHourlySound("soft-ping", 0.5);
      setUndoToast(null);
    }
  };

  const handleSaveEdit = () => {
    if (!onUpdateTargets) return;

    const newMap = data.monthlyTargets ? { ...data.monthlyTargets } : {};
    const viewedMonthStart = startOfMonth(currentMonth);

    // Find targets active in previous months
    const previousActiveMap = new Map<string, TargetMeta>();
    Object.keys(newMap).sort().forEach(m => {
      if (m < monthStr) {
        for (const t of newMap[m]) {
          if (t.accomplishedAt === "dropped") {
            previousActiveMap.delete(t.name);
            continue;
          }
          if (t.accomplishedAt) {
            const accDate = new Date(t.accomplishedAt);
            if (isBefore(accDate, viewedMonthStart)) continue;
          }
          previousActiveMap.set(t.name, t);
        }
      }
    });

    const currentMonthSavedTargets: TargetMeta[] = [];

    // 1. Handle surviving and new targets in their customized local order
    localTargets.forEach(lt => {
      currentMonthSavedTargets.push(lt);
    });

    // 2. Handle deletions of carried-over targets
    previousActiveMap.forEach((prevTarget, name) => {
      if (!localTargets.some(lt => lt.name === name)) {
        currentMonthSavedTargets.push({ name, accomplishedAt: "dropped", createdAt: prevTarget.createdAt });
      }
    });

    newMap[monthStr] = currentMonthSavedTargets;
    onUpdateTargets(newMap);
    setIsEditing(false);
  };

  // Build row stats for all targets
  const rowStats: RowStat[] = currentMonthlyTargets.map((targetMeta, rowIdx) => {
    const target = targetMeta.name;
    let completed = 0;

    const startOfCurrentMonth = startOfMonth(currentMonth);
    const endOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), daysInMonth);

    let startDay = 1;
    if (targetMeta.createdAt) {
      const createdDate = new Date(targetMeta.createdAt);
      if (isSameMonth(createdDate, currentMonth)) {
        startDay = createdDate.getDate();
      } else if (isAfter(createdDate, endOfCurrentMonth)) {
        startDay = daysInMonth + 1;
      }
    }

    let endDay = daysInMonth;
    if (targetMeta.accomplishedAt) {
      const accDate = new Date(targetMeta.accomplishedAt);
      if (isSameMonth(accDate, currentMonth)) {
        endDay = accDate.getDate();
      } else if (isBefore(accDate, startOfCurrentMonth)) {
        endDay = 0;
      }
    }

    const activeDaysCount = Math.max(1, endDay - startDay + 1);

    let elapsedEndDay = isSameMonth(now, currentMonth) ? now.getDate() : (isAfter(now, endOfCurrentMonth) ? daysInMonth : 0);
    elapsedEndDay = Math.min(elapsedEndDay, endDay);
    const targetElapsedDays = Math.max(0, elapsedEndDay - startDay + 1);

    days.forEach((dateStr, idx) => {
      const dayData = data.days[dateStr];
      const dayNum = idx + 1;
      if (dayNum >= startDay && dayNum <= endDay) {
        if (dayData?.targets?.[target]) {
          completed++;
        }
      }
    });

    const isAccomplished = !!targetMeta.accomplishedAt && targetMeta.accomplishedAt !== "dropped" && targetMeta.accomplishedAt <= `${monthStr}-31`;
    let accomplishedDay = -1;
    if (isAccomplished && targetMeta.accomplishedAt?.startsWith(monthStr)) {
      accomplishedDay = parseInt(targetMeta.accomplishedAt.split("-")[2], 10);
    }

    let targetDeadline: string | undefined = undefined;
    let challengeStartDate: string | undefined = undefined;
    if (data.challenges) {
      const activeChallenge = data.challenges.find(c => c.status === "active");
      if (activeChallenge && activeChallenge.targetMapping && activeChallenge.goalMetadata) {
        const mappedGoal = Object.entries(activeChallenge.targetMapping).find(([goal, targets]) => targets.includes(targetMeta.name))?.[0];
        if (mappedGoal) {
          targetDeadline = activeChallenge.goalMetadata[mappedGoal]?.deadline;
          challengeStartDate = activeChallenge.startDate;
        }
      }
    }

    const rowColors = [
      "bg-blue-500/[0.03] dark:bg-blue-500/10",
      "bg-purple-500/[0.03] dark:bg-purple-500/10",
      "bg-emerald-500/[0.03] dark:bg-emerald-500/10",
      "bg-amber-500/[0.03] dark:bg-amber-500/10",
      "bg-rose-500/[0.03] dark:bg-rose-500/10",
      "bg-indigo-500/[0.03] dark:bg-indigo-500/10",
      "bg-teal-500/[0.03] dark:bg-teal-500/10"
    ];
    const rowBg = rowColors[rowIdx % rowColors.length];

    return {
      targetMeta,
      completed,
      percent: Math.round((completed / (activeDaysCount || 1)) * 100),
      expected: Math.round((targetElapsedDays / (activeDaysCount || 1)) * 100) + "%",
      targetElapsedDays,
      isAccomplished,
      accomplishedDay,
      targetDeadline,
      challengeStartDate,
      rowBg
    };
  });

  // Separate rowStats into Active and Completed partitions
  const activeRowStats = useMemo(() => {
    return rowStats.filter(r => !r.isAccomplished);
  }, [rowStats]);

  const completedRowStats = useMemo(() => {
    return rowStats.filter(r => r.isAccomplished);
  }, [rowStats]);

  // Filter & Sort active targets
  const filteredActiveRowStats = useMemo(() => {
    let result = activeRowStats;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => r.targetMeta.name.toLowerCase().includes(q));
    }

    // Status filter
    if (activeFilter === "pending-today") {
      result = result.filter(r => !data.days[todayStr]?.targets?.[r.targetMeta.name]);
    } else if (activeFilter === "done-today") {
      result = result.filter(r => !!data.days[todayStr]?.targets?.[r.targetMeta.name]);
    }

    // Sort
    if (sortOrder === "percent-desc") {
      result = [...result].sort((a, b) => b.percent - a.percent);
    } else if (sortOrder === "percent-asc") {
      result = [...result].sort((a, b) => a.percent - b.percent);
    } else if (sortOrder === "alpha") {
      result = [...result].sort((a, b) => a.targetMeta.name.localeCompare(b.targetMeta.name));
    }

    return result;
  }, [activeRowStats, searchQuery, activeFilter, sortOrder, data.days, todayStr]);

  // Active col stats for trendline & footer
  const activeColStats = useMemo(() => {
    return days.map((dateStr) => {
      const dayData = data.days[dateStr];
      let completed = 0;
      const applicableTargets = activeRowStats.length;

      activeRowStats.forEach(r => {
        if (dayData?.targets?.[r.targetMeta.name]) completed++;
      });

      return {
        completed,
        incomplete: Math.max(0, applicableTargets - completed),
        percent: Math.round((completed / (applicableTargets || 1)) * 100)
      };
    });
  }, [days, activeRowStats, data.days]);

  // Overall level & rank calculations
  let totalElapsedDays = 0;
  let totalCompleted = 0;
  rowStats.forEach(r => {
    totalElapsedDays += r.targetElapsedDays;
    totalCompleted += r.completed;
  });

  const currentLevelNum = totalElapsedDays > 0 ? (totalCompleted / totalElapsedDays) * 100 : 0;
  const currentLevel = currentLevelNum.toFixed(2);

  let rankStr = "E";
  let rankColor = "text-red-400";
  let rankLabel = "Needs Work";
  if (currentLevelNum >= 90) { rankStr = "S"; rankColor = "text-amber-500"; rankLabel = "Legendary"; }
  else if (currentLevelNum >= 80) { rankStr = "A"; rankColor = "text-purple-500"; rankLabel = "Elite"; }
  else if (currentLevelNum >= 70) { rankStr = "B"; rankColor = "text-blue-500"; rankLabel = "Solid"; }
  else if (currentLevelNum >= 50) { rankStr = "C"; rankColor = "text-emerald-500"; rankLabel = "Average"; }

  // Count done today
  const doneTodayCount = activeRowStats.filter(r => !!data.days[todayStr]?.targets?.[r.targetMeta.name]).length;
  const pendingTodayCount = activeRowStats.length - doneTodayCount;

  // Render a single target row
  const renderRow = (stat: RowStat, isCompletedCard: boolean) => {
    const { targetMeta, isAccomplished, accomplishedDay, targetDeadline, challengeStartDate, rowBg } = stat;

    return (
      <tr
        key={targetMeta.name}
        className={`hover:brightness-95 dark:hover:brightness-110 transition-all ${rowBg} ${
          isCompletedCard ? "opacity-90" : ""
        }`}
      >
        {/* Targets Column */}
        <td
          className="p-2 border font-semibold text-left text-xs truncate min-w-[160px] max-w-[220px]"
          style={{
            borderColor: "var(--border)",
            color: isAccomplished ? "var(--emerald-500)" : "var(--text)"
          }}
        >
          <div className="flex items-center gap-1.5">
            {isAccomplished ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={11} />
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
            <span
              className={`truncate ${isAccomplished ? "line-through opacity-80" : ""}`}
              title={targetMeta.name}
            >
              {targetMeta.name}
            </span>
          </div>
        </td>

        {/* Done? / Action Column */}
        <td className="p-2 border" style={{ borderColor: "var(--border)" }}>
          {isCompletedCard ? (
            // In Completed Card: prominent Restore button to move back to the top
            <button
              onClick={() => handleAccomplishToggle(targetMeta)}
              className="px-2 py-1 mx-auto rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all bg-emerald-500/15 hover:bg-amber-500/25 text-emerald-400 hover:text-amber-300 border border-emerald-500/30 hover:border-amber-500/40 hover:scale-105 active:scale-95 shadow-sm"
              title="Click by mistake? Restore & move back to Active Targets (Top)"
            >
              <RotateCcw size={11} className="shrink-0" />
              <span>To Top ↑</span>
            </button>
          ) : (
            // In Active Card: Trophy button to complete and move to the down
            <button
              onClick={() => handleAccomplishToggle(targetMeta)}
              className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all bg-white/5 hover:bg-emerald-500/20 text-[var(--muted)] hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 hover:scale-110 active:scale-95 group"
              title="Mark complete & move to Completed card below ↓"
            >
              <Trophy size={13} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
        </td>

        {/* Ideal Column */}
        <td className="p-2 border text-xs font-bold text-[var(--faint)]" style={{ borderColor: "var(--border)" }}>
          {stat.expected}
        </td>

        {/* % Column */}
        <td
          className="p-2 border text-xs font-bold"
          style={{
            borderColor: "var(--border)",
            color: isAccomplished ? "var(--emerald-500)" : "var(--primary)"
          }}
        >
          {stat.percent}%
        </td>

        {/* Days Columns */}
        {days.map((dateStr, colIdx) => {
          const dayNum = colIdx + 1;
          const isCompleted = data.days[dateStr]?.targets?.[targetMeta.name] || false;
          const isFuture = dateStr > todayStr;
          const isDisabled = isFuture || (isAccomplished && dayNum > accomplishedDay && accomplishedDay !== -1);

          const isChallengeActiveOnDate = !!data.challenges?.find(c => {
            if (c.status !== "active") return false;
            const cStart = new Date(c.startDate);
            const date = new Date(dateStr);
            const diff = differenceInDays(date, cStart);
            return diff >= 0 && diff < c.durationDays;
          });

          let isRunway = false;
          let isDeadlineDay = false;
          if (targetDeadline && challengeStartDate) {
            if (dateStr >= challengeStartDate && dateStr <= targetDeadline) {
              isRunway = true;
            }
            if (dateStr === targetDeadline) {
              isDeadlineDay = true;
            }
          }

          let cellBg = "";
          if (isDisabled) cellBg = "bg-[var(--s2)] opacity-30";
          else if (isDeadlineDay) cellBg = "bg-red-500/10 dark:bg-red-500/20 border-r-2 !border-r-red-500 relative";
          else if (isRunway) cellBg = "bg-blue-500/10 dark:bg-blue-500/20";
          else if (isChallengeActiveOnDate) cellBg = "bg-orange-500/5 dark:bg-orange-500/10";

          return (
            <td key={colIdx} className={`p-0 border relative ${cellBg}`} style={{ borderColor: "var(--border)" }}>
              <button
                disabled={isDisabled}
                onClick={() => onToggle(dateStr, targetMeta.name)}
                className="w-full h-full min-h-[30px] flex items-center justify-center transition-colors hover:bg-white/10 disabled:hover:bg-transparent"
                title={`${targetMeta.name} — ${format(new Date(dateStr), "MMM d, yyyy")}`}
              >
                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-[var(--faint)] bg-transparent"
                }`}>
                  {isCompleted && (
                    <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 text-white">
                      <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {isDeadlineDay && (
                  <div className="absolute top-0 right-0 p-[2px] opacity-70">
                    <Flag size={8} className="text-red-500 fill-red-500" />
                  </div>
                )}
              </button>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="w-full px-4 mx-auto space-y-6 fade-up relative">
      {/* Confetti Overlay Canvas */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Floating Undo Toast (for effortless 1-click mistake recovery) */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl bg-slate-900/95 border-emerald-500/40 text-white fade-up">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Trophy size={16} />
          </div>
          <div className="text-xs">
            <p className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>Goal Accomplished!</span>
              <Sparkles size={12} className="text-amber-400" />
            </p>
            <p className="text-slate-300">
              <span className="font-semibold text-white">"{undoToast.name}"</span> moved to Completed Targets below.
            </p>
          </div>
          <button
            onClick={() => {
              handleAccomplishToggle(undoToast.targetMeta);
              setUndoToast(null);
            }}
            className="ml-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95"
            title="Undo move & restore back to top"
          >
            <Undo2 size={13} />
            <span>Undo (Move Top)</span>
          </button>
          <button
            onClick={() => setUndoToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Month Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--s2)" }}>
            <Target className="primary-text" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Goal Tracker</h2>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {activeRowStats.length} Active · {completedRowStats.length} Done
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--faint)" }}>
              Separate active & completed boards. Stay focused. Hope is everything.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onOpenPicker && (
            <button
              onClick={onOpenPicker}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm"
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "var(--text)"
              }}
              title="Pick which target to work on next (Decider)"
            >
              <Dices size={14} className="text-amber-400" />
              <span>Pick Next 🎲</span>
            </button>
          )}

          {/* Edit Targets & Priority Order Dropdown */}
          {onUpdateTargets && (
            <div className="relative">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-2"
                style={{ background: isEditing ? "var(--s2)" : "transparent" }}
              >
                Edit Targets / Set Priorities
                <ChevronDown size={14} className={`transition-transform ${isEditing ? "rotate-180" : ""}`} />
              </button>

              {isEditing && (
                <div
                  className="absolute right-0 top-full mt-2 w-88 p-5 rounded-xl shadow-2xl z-50 fade-up"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>
                      Manage Targets for {format(currentMonth, "MMM yyyy")}
                    </h3>
                  </div>
                  <p className="text-[11px] mb-4 text-[var(--muted)]">
                    Use Up 🔼 / Down 🔽 arrows to re-order priority targets.
                  </p>

                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 mb-4">
                    {localTargets.length === 0 && (
                      <span className="text-xs text-[var(--faint)]">No targets added yet.</span>
                    )}
                    {localTargets.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: "var(--s2)", border: "1px solid var(--border)" }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] opacity-40 font-mono w-4">{idx + 1}.</span>
                          <span style={{ color: "var(--text)" }} className="truncate">{t.name}</span>
                          {t.accomplishedAt && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Done
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...localTargets];
                              const temp = next[idx];
                              next[idx] = next[idx - 1];
                              next[idx - 1] = temp;
                              setLocalTargets(next);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-20 disabled:hover:bg-transparent"
                            title="Move up"
                          >
                            <ChevronUp size={13} />
                          </button>
                          {/* Move Down */}
                          <button
                            disabled={idx === localTargets.length - 1}
                            onClick={() => {
                              const next = [...localTargets];
                              const temp = next[idx];
                              next[idx] = next[idx + 1];
                              next[idx + 1] = temp;
                              setLocalTargets(next);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-20 disabled:hover:bg-transparent"
                            title="Move down"
                          >
                            <ChevronDown size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setLocalTargets(localTargets.filter((_, i) => i !== idx))}
                            className="p-1 rounded hover:text-red-400 hover:bg-red-500/10 transition-colors text-[var(--faint)]"
                            title="Remove target"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mb-4">
                    <input
                      value={newTarget}
                      onChange={e => setNewTarget(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newTarget.trim()) {
                          if (!localTargets.find(t => t.name === newTarget.trim())) {
                            setLocalTargets([...localTargets, { name: newTarget.trim(), createdAt: format(new Date(), "yyyy-MM-dd") }]);
                          }
                          setNewTarget("");
                        }
                      }}
                      placeholder="New Target Name..."
                      className="px-3 py-2 text-xs rounded-lg border bg-transparent flex-1 focus:outline-none"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    <button
                      onClick={() => {
                        if (newTarget.trim() && !localTargets.find(t => t.name === newTarget.trim())) {
                          setLocalTargets([...localTargets, { name: newTarget.trim(), createdAt: format(new Date(), "yyyy-MM-dd") }]);
                          setNewTarget("");
                        }
                      }}
                      className="p-2 rounded-lg btn-ghost flex items-center justify-center shrink-0 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn-ghost flex-[1] text-xs py-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="btn-primary flex-[2] text-xs py-2"
                    >
                      Save to Ledger ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Month selector */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "var(--muted)" }}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-xs w-28 text-center" style={{ color: "var(--text)" }}>
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "var(--muted)" }}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl text-center space-y-1 relative overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Current Level</p>
          <p className="text-3xl font-bold text-emerald-500">{currentLevel}%</p>
          <div className="w-full bg-slate-700/30 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, currentLevelNum))}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl flex items-center justify-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl font-black text-2xl" style={{ backgroundColor: "var(--s2)", border: `1px solid var(--border)` }}>
            <span className={rankColor}>{rankStr}</span>
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Rank Status</p>
            <p className={`font-bold ${rankColor}`}>{rankLabel}</p>
            <p className="text-[10px] text-[var(--muted)]">
              {activeRowStats.length} active · {completedRowStats.length} finished
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl text-center space-y-1 flex flex-col justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Reward Target</p>
          <input
            type="text"
            value={rewardTarget}
            onChange={(e) => {
              setRewardTarget(e.target.value);
              localStorage.setItem(`reward_target_${monthStr}`, e.target.value);
            }}
            placeholder="e.g. Vacation 🌴 4 Days"
            className="text-center font-bold bg-transparent border-none focus:ring-0 w-full mt-1 text-sm"
            style={{ color: "var(--text)", outline: "none" }}
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP CARD: ACTIVE TARGETS                                               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="active-targets-card"
        className="rounded-xl border shadow-sm relative overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Card Header Bar with Filters */}
        <div
          className="p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderColor: "var(--border)", background: "var(--s2)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Target size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                  Active Targets
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {filteredActiveRowStats.length} of {activeRowStats.length} In Progress
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Goals currently in flight. Click the 🏆 Trophy when accomplished to move down.
              </p>
            </div>
          </div>

          {/* Search, Filter Pills, Sort, and Jump */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search active..."
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg border bg-transparent focus:outline-none w-32 sm:w-36"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center p-0.5 rounded-lg border text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  activeFilter === "all" ? "bg-[var(--s2)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                All ({activeRowStats.length})
              </button>
              <button
                onClick={() => setActiveFilter("pending-today")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  activeFilter === "pending-today" ? "bg-[var(--s2)] text-amber-400 shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
                title="Targets not yet checked for today"
              >
                Pending Today ({pendingTodayCount})
              </button>
              <button
                onClick={() => setActiveFilter("done-today")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  activeFilter === "done-today" ? "bg-[var(--s2)] text-emerald-400 shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
                title="Targets checked for today"
              >
                Done Today ({doneTodayCount})
              </button>
            </div>

            {/* Sort order */}
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as TargetSortOrder)}
              className="px-2 py-1 text-[11px] rounded-lg border bg-transparent font-medium focus:outline-none"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <option value="default" className="bg-slate-900 text-white">Sort: Default</option>
              <option value="percent-desc" className="bg-slate-900 text-white">Sort: High %</option>
              <option value="percent-asc" className="bg-slate-900 text-white">Sort: Low %</option>
              <option value="alpha" className="bg-slate-900 text-white">Sort: A-Z</option>
            </select>

            {/* Quick jump to Completed targets down below */}
            {completedRowStats.length > 0 && (
              <button
                onClick={() => {
                  document.getElementById("completed-targets-card")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Jump down to completed targets"
              >
                <Trophy size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Completed ({completedRowStats.length})</span>
                <span>↓</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Grid Table — naturally expanded with no internal vertical scrollbar */}
        <div className="overflow-x-auto relative custom-scrollbar">
          <table className="w-full text-sm text-center border-collapse">
            <thead className="sticky top-0 z-20" style={{ background: "var(--s2)" }}>
              <tr>
                <th
                  className="p-2 border font-medium text-left min-w-[160px] sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                  style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                >
                  Active Targets
                </th>
                <th
                  className="p-2 border font-medium w-16 sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                  title="Mark Accomplished (Moves down to Completed Targets)"
                  style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                >
                  Done?
                </th>
                <th
                  className="p-2 border font-medium w-16 sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                  title="Ideal completion by today"
                  style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                >
                  Ideal
                </th>
                <th
                  className="p-2 border font-medium w-16 sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                  style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                >
                  %
                </th>
                {days.map((dateStr, i) => {
                  const isChallengeActiveOnDate = !!data.challenges?.find(c => {
                    if (c.status !== "active") return false;
                    const cStart = new Date(c.startDate);
                    const date = new Date(dateStr);
                    const diff = differenceInDays(date, cStart);
                    return diff >= 0 && diff < c.durationDays;
                  });
                  return (
                    <th
                      key={i}
                      className="p-2 border font-medium w-8 text-[10px] sticky top-0 z-20 shadow-[0_1px_0_var(--border)] relative overflow-hidden"
                      style={{ borderColor: "var(--border)", color: "var(--faint)", backgroundColor: "var(--s2)" }}
                    >
                      {isChallengeActiveOnDate && (
                        <div className="absolute inset-0 bg-orange-500/10 dark:bg-orange-500/20 pointer-events-none" />
                      )}
                      <div className="flex flex-col items-center leading-tight gap-0.5 relative z-10">
                        <span className="opacity-50 text-[8px] uppercase">{format(new Date(dateStr), "EEE")}</span>
                        <span className="text-xs">{i + 1}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredActiveRowStats.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 4} className="p-8 text-center text-[var(--faint)]">
                    {activeRowStats.length === 0 ? (
                      <div className="space-y-2 py-4">
                        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text)]">
                          All Targets Accomplished! 🎉
                        </h4>
                        <p className="text-xs text-[var(--muted)]">
                          Outstanding job! All of your targets for this month are in the Completed card down below.
                        </p>
                      </div>
                    ) : (
                      "No active targets match your filter. Click 'All' to clear filter."
                    )}
                  </td>
                </tr>
              ) : (
                filteredActiveRowStats.map(stat => renderRow(stat, false))
              )}
            </tbody>
            <tfoot>
              {/* Active Trendline */}
              <tr>
                <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                  Trend
                </td>
                <td colSpan={days.length} className="p-0 border relative" style={{ borderColor: "var(--border)", background: "var(--s2)" }}>
                  <div className="w-full h-12 opacity-80 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activeColStats.map((s, i) => ({ day: i + 1, percent: s.percent }))} margin={{ top: 5, right: 16, left: 16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPercentActive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="percent"
                          stroke="var(--primary)"
                          fillOpacity={1}
                          fill="url(#colorPercentActive)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </td>
              </tr>
              {/* Progress % */}
              <tr>
                <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                  Progress %
                </td>
                {activeColStats.map((stat, i) => (
                  <td key={i} className="p-1 border text-[10px] font-bold" style={{ borderColor: "var(--border)", color: "var(--primary)", background: "var(--s2)" }}>
                    {stat.percent}%
                  </td>
                ))}
              </tr>
              {/* Complete */}
              <tr>
                <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                  Complete
                </td>
                {activeColStats.map((stat, i) => (
                  <td key={i} className="p-1 border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    {stat.completed}
                  </td>
                ))}
              </tr>
              {/* Incomplete */}
              <tr>
                <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                  Incomplete
                </td>
                {activeColStats.map((stat, i) => (
                  <td key={i} className="p-1 border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--faint)" }}>
                    {stat.incomplete}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. BOTTOM CARD: COMPLETED TARGETS (MOVED DOWN)                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="completed-targets-card"
        className="rounded-xl border shadow-sm relative overflow-hidden transition-all"
        style={{
          borderColor: completedRowStats.length > 0 ? "rgba(16, 185, 129, 0.4)" : "var(--border)",
          background: "var(--surface)"
        }}
      >
        {/* Card Header Bar */}
        <div
          className="p-3.5 sm:p-4 border-b flex items-center justify-between gap-3"
          style={{ borderColor: "var(--border)", background: "var(--s2)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Trophy size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                  Completed Targets
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {completedRowStats.length} Accomplished
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Finished goals. If you clicked by mistake, click <span className="text-emerald-400 font-semibold">"To Top ↑"</span> to move it back anytime!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick jump back to Active targets card at the top */}
            <button
              onClick={() => {
                document.getElementById("active-targets-card")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all hover:scale-105 active:scale-95"
              title="Jump back to active targets at the top"
            >
              <ArrowUp size={13} />
              <span className="hidden sm:inline">Active Targets</span>
              <span>↑</span>
            </button>

            <button
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1 text-xs font-semibold"
              title={isCompletedExpanded ? "Collapse completed card" : "Expand completed card"}
            >
              <span>{isCompletedExpanded ? "Collapse" : "Expand"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isCompletedExpanded ? "rotate-0" : "-rotate-90"}`}
              />
            </button>
          </div>
        </div>

        {/* Completed Targets Content — naturally expanded with no internal vertical scrollbar */}
        {isCompletedExpanded && (
          <div>
            {completedRowStats.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Trophy size={18} />
                </div>
                <h4 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  No Targets Completed Yet
                </h4>
                <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                  When you achieve a monthly target, click the <span className="text-amber-400 font-semibold">Trophy 🏆</span> in the Active Targets card above. It will move down here with all its progress preserved. You can move it back anytime!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full text-sm text-center border-collapse">
                  <thead className="sticky top-0 z-20" style={{ background: "var(--s2)" }}>
                    <tr>
                      <th
                        className="p-2 border font-medium text-left min-w-[160px] sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                        style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                      >
                        Accomplished Targets
                      </th>
                      <th
                        className="p-2 border font-medium w-24 sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                        title="Move back to Active Targets (Top)"
                        style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                      >
                        Restore?
                      </th>
                      <th
                        className="p-2 border font-medium w-16 sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                        style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                      >
                        Ideal
                      </th>
                      <th
                        className="p-2 border font-medium w-16 sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                        style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}
                      >
                        Final %
                      </th>
                      {days.map((dateStr, i) => (
                        <th
                          key={i}
                          className="p-2 border font-medium w-8 text-[10px] sticky top-0 z-20 shadow-[0_1px_0_var(--border)]"
                          style={{ borderColor: "var(--border)", color: "var(--faint)", backgroundColor: "var(--s2)" }}
                        >
                          <div className="flex flex-col items-center leading-tight gap-0.5">
                            <span className="opacity-50 text-[8px] uppercase">{format(new Date(dateStr), "EEE")}</span>
                            <span className="text-xs">{i + 1}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {completedRowStats.map(stat => renderRow(stat, true))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
