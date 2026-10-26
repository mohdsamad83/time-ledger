"use client";
import { useState, useEffect, useMemo } from "react";
import { TimeBlock, DaySetup, Category, CustomCategory, RoutineItem, Challenge } from "@/lib/types";
import { Plus, Edit2, Moon, CheckSquare, Star, Flame, Zap, Trophy, Dices } from "lucide-react";
import { SyncState } from "@/lib/types";
import { differenceInDays } from "date-fns";

export interface TimelineSlot {
  id: string;
  slotKey: number;          // Unique key used in blocks dictionary (e.g. 13.5)
  startHour: number;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  timeLabel: string;
  durationLabel: string;
  routineItem: RoutineItem | null;
}

interface Props {
  date:          string;
  setup:         DaySetup;
  blocks:        { [hour: number]: TimeBlock };
  routine:       RoutineItem[];
  syncState:     SyncState;
  onLogBlock:    (hour: number, timeLabel?: string, durationLabel?: string, prefillActivity?: string) => void;
  onEveningReview: () => void;
  hasEveningReview: boolean;
  dayTargets: Record<string, boolean>;
  allTargets: string[];
  categories: CustomCategory[];
  onToggleTarget: (targetName: string) => void;
  onUpdateCommitments?: (tasks: [string, string, string]) => void;
  onExtendDay?: () => void;
  activeChallenge?: Challenge | null;
  targetRank?: { level: string, rankStr: string, rankColor: string, rankLabel: string };
  onOpenPicker?: () => void;
  monthlyCompletedCount?: number;
  onViewTargets?: () => void;
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return null;
  return h * 60 + m;
}

function minutesTo12Hour(totalMins: number): string {
  const norm = ((totalMins % (24 * 60)) + (24 * 60)) % (24 * 60);
  let hr = Math.floor(norm / 60);
  const min = norm % 60;
  const period = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  const minStr = min === 0 ? "00" : String(min).padStart(2, "0");
  return `${hr}:${minStr} ${period}`;
}

function formatTimeRange(startMins: number, endMins: number): string {
  const startStr = minutesTo12Hour(startMins);
  const endStr = minutesTo12Hour(endMins);

  const startParts = startStr.split(" ");
  const endParts = endStr.split(" ");
  if (startParts.length === 2 && endParts.length === 2 && startParts[1] === endParts[1]) {
    return `${startParts[0]} – ${endParts[0]} ${endParts[1]}`;
  }
  return `${startStr} – ${endStr}`;
}

function formatDuration(durationMins: number): string {
  if (durationMins <= 0) return "";
  const hrs = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  if (mins === 30) return `${hrs}.5 hrs`;
  return `${hrs}h ${mins}m`;
}

function generateTimelineSlots(setup: DaySetup, routine: RoutineItem[]): TimelineSlot[] {
  const validRoutine = (routine || [])
    .filter(r => r.activity && r.startTime && r.endTime)
    .map(r => {
      let s = parseTimeToMinutes(r.startTime);
      let e = parseTimeToMinutes(r.endTime);
      if (s === null || e === null) return null;
      if (e < s) e += 24 * 60; // handle overnight transition
      return { item: r, start: s, end: e };
    })
    .filter(Boolean) as { item: RoutineItem; start: number; end: number }[];

  // If no routine defined, fall back to standard 1-hour slots
  if (validRoutine.length === 0) {
    const count = setup.sleepHour > setup.wakeHour 
      ? setup.sleepHour - setup.wakeHour 
      : 24 - setup.wakeHour + setup.sleepHour;
    return Array.from({ length: Math.max(1, count) }, (_, i) => {
      const h = (setup.wakeHour + i) % 24;
      const sM = h * 60;
      const eM = (h + 1) * 60;
      return {
        id: `slot-h${h}`,
        slotKey: h,
        startHour: h,
        startMinutes: sM,
        endMinutes: eM,
        durationMinutes: 60,
        timeLabel: formatTimeRange(sM, eM),
        durationLabel: "1 hr",
        routineItem: null,
      };
    });
  }

  // Sort routine items chronologically
  validRoutine.sort((a, b) => a.start - b.start);

  // Day boundaries from setup (in minutes)
  let dayStart = setup.wakeHour * 60;
  let dayEnd = setup.sleepHour > setup.wakeHour ? setup.sleepHour * 60 : (setup.sleepHour + 24) * 60;

  if (validRoutine[0].start < dayStart) dayStart = validRoutine[0].start;
  if (validRoutine[validRoutine.length - 1].end > dayEnd) dayEnd = validRoutine[validRoutine.length - 1].end;

  const slots: TimelineSlot[] = [];
  let curr = dayStart;

  for (const r of validRoutine) {
    // If routine item ends before current time, skip
    if (r.end <= curr) continue;
    // Adjust start if slightly overlapping with previous end
    const itemStart = Math.max(r.start, curr);
    if (r.end <= itemStart) continue;

    // Open gap before routine item
    if (itemStart > curr) {
      let gapCurr = curr;
      while (gapCurr < itemStart) {
        const gapNext = Math.min(gapCurr + 60, itemStart);
        const gapDur = gapNext - gapCurr;
        const sH = Number((gapCurr / 60).toFixed(2));
        slots.push({
          id: `open-${gapCurr}`,
          slotKey: sH,
          startHour: sH,
          startMinutes: gapCurr,
          endMinutes: gapNext,
          durationMinutes: gapDur,
          timeLabel: formatTimeRange(gapCurr, gapNext),
          durationLabel: formatDuration(gapDur),
          routineItem: null,
        });
        gapCurr = gapNext;
      }
    }

    // Add the routine item slot (EXACTLY ONCE)
    const dur = r.end - itemStart;
    const sH = Number((itemStart / 60).toFixed(2));
    slots.push({
      id: `routine-${itemStart}-${r.item.activity}`,
      slotKey: sH,
      startHour: sH,
      startMinutes: itemStart,
      endMinutes: r.end,
      durationMinutes: dur,
      timeLabel: formatTimeRange(itemStart, r.end),
      durationLabel: formatDuration(dur),
      routineItem: r.item,
    });

    curr = r.end;
  }

  // Open gap after last routine item up to dayEnd
  while (curr < dayEnd) {
    const next = Math.min(curr + 60, dayEnd);
    const dur = next - curr;
    const sH = Number((curr / 60).toFixed(2));
    slots.push({
      id: `open-${curr}`,
      slotKey: sH,
      startHour: sH,
      startMinutes: curr,
      endMinutes: next,
      durationMinutes: dur,
      timeLabel: formatTimeRange(curr, next),
      durationLabel: formatDuration(dur),
      routineItem: null,
    });
    curr = next;
  }

  return slots;
}

const nowHour = () => new Date().getHours();

export default function TimelineView({
  date, setup, blocks, routine, onLogBlock, onEveningReview, hasEveningReview, 
  dayTargets, allTargets, categories, onToggleTarget, onUpdateCommitments, onExtendDay, 
  activeChallenge, targetRank, onOpenPicker, monthlyCompletedCount = 0, onViewTargets
}: Props) {
  const slots = useMemo(() => generateTimelineSlots(setup, routine), [setup.wakeHour, setup.sleepHour, routine]);

  const now = new Date();
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
  const isToday = date === localDate;
  const currentHour = nowHour();
  const loggedCount  = Object.keys(blocks).length;
  // Compute cumulative target progress for the day
  const targetProgress: Record<string, number> = {};
  Object.values(blocks).forEach(b => {
    b.contributedTargets?.forEach(t => {
      targetProgress[t.name] = Math.min((targetProgress[t.name] || 0) + t.percentage, 100);
    });
  });

  const completedTargetsCount = allTargets.filter(t => targetProgress[t] >= 100).length;
  const plannedCount = Object.values(blocks).filter((b) => b.wasPlanned).length;
  const priorityCount = Object.values(blocks).filter((b) => b.contributedPriority ? b.contributedPriority !== "None" : b.contributedToTopPriority).length;
  const avgSat = loggedCount > 0
    ? (Object.values(blocks).reduce((a, b) => a + b.satisfaction, 0) / loggedCount).toFixed(1)
    : "—";


  const commitments = setup.tasks || ["", "", ""];
  const isPrePlanned = !!setup.plannedInAdvance;
  const canEditPlan = isPrePlanned && (setup.tasksEdits || 0) < 1;
  const isLocked = isPrePlanned && !canEditPlan;

  const [isEditingCommitments, setIsEditingCommitments] = useState(false);
  const [localCommitments, setLocalCommitments] = useState<[string, string, string]>(commitments);

  useEffect(() => {
    setLocalCommitments(setup.tasks || ["", "", ""]);
  }, [setup.tasks]);
  
  const handleSelectCommitment = (index: number, value: string) => {
    if (isPrePlanned && !isEditingCommitments) return;

    if (isPrePlanned && isEditingCommitments) {
      const newComm = [...localCommitments] as [string, string, string];
      newComm[index] = value;
      setLocalCommitments(newComm);
    } else {
      if (!onUpdateCommitments) return;
      const newComm = [...commitments] as [string, string, string];
      newComm[index] = value;
      onUpdateCommitments(newComm);
    }
  };

  const handleSaveCommitments = () => {
    if (!onUpdateCommitments) return;
    onUpdateCommitments(localCommitments);
    setIsEditingCommitments(false);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 pb-16 grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_320px] gap-6 xl:gap-8 items-start">
      
      {/* LEFT COLUMN: Targets & Commitments */}
      <div className="space-y-6 lg:sticky lg:top-24">
        
        {/* Anti-Paralysis Decision Trigger */}
        {onOpenPicker && (
          <button
            onClick={onOpenPicker}
            className="w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(56, 189, 248, 0.12) 100%)",
              borderColor: "rgba(245, 158, 11, 0.35)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-400 font-bold shrink-0">
                <Dices size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight" style={{ color: "var(--text)" }}>Unsure what to do?</h4>
                <p className="text-[10px] leading-tight" style={{ color: "var(--faint)" }}>Roll 3D Dice / Wheel to pick target</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors shrink-0">
              Pick 🎲
            </span>
          </button>
        )}

        {/* Top 3 Commitments */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              <h3 className="font-semibold text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>Top 3 Commitments</h3>
            </div>
            {isLocked && (
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}>
                Locked
              </span>
            )}
          </div>
          <p className="text-xs mb-4 italic" style={{ color: "var(--faint)" }}>
            {isLocked ? "These commitments were planned in advance and are now locked." : "Select 3 targets to prioritize today."}
          </p>
          <div className="space-y-3">
            {[0, 1, 2].map(i => {
              const currentVal = (isPrePlanned && isEditingCommitments) ? localCommitments[i] : commitments[i];
              const isDisabled = isLocked || (isPrePlanned && !isEditingCommitments);
              return (
                <div key={i} className="flex flex-col bg-opacity-50 rounded-lg p-2" style={{ background: "var(--s2)" }}>
                  <select
                    value={currentVal}
                    onChange={(e) => handleSelectCommitment(i, e.target.value)}
                    disabled={isDisabled}
                    className="text-sm rounded border-none focus:ring-1 focus:ring-[var(--gold)] w-full font-medium"
                    style={{ background: "transparent", color: currentVal ? "var(--text)" : "var(--faint)", padding: "4px", opacity: isDisabled ? 0.8 : 1 }}
                  >
                    <option value="">-- Select a Target --</option>
                    {allTargets.map(t => (
                      <option key={t} value={t} disabled={((isPrePlanned && isEditingCommitments) ? localCommitments : commitments).includes(t) && currentVal !== t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {currentVal && !isEditingCommitments && (
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span style={{ color: targetProgress[currentVal] >= 100 ? "#34D399" : "var(--muted)" }}>
                          {targetProgress[currentVal] >= 100 ? "Completed" : "Progress"}
                        </span>
                        <span className="font-mono font-bold" style={{ color: "var(--text)" }}>
                          {targetProgress[currentVal] || 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div 
                          className="h-full transition-all duration-500 ease-out" 
                          style={{ 
                            width: `${targetProgress[currentVal] || 0}%`,
                            background: targetProgress[currentVal] >= 100 ? "#34D399" : "var(--primary)"
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isPrePlanned && !isLocked && !isEditingCommitments && (
            <button 
              onClick={() => setIsEditingCommitments(true)}
              className="mt-4 w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors"
              style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)" }}
            >
              Edit Plan (1 chance remaining)
            </button>
          )}

          {isEditingCommitments && (
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => {
                  setIsEditingCommitments(false);
                  setLocalCommitments(setup.tasks || ["", "", ""]);
                }}
                className="flex-1 py-2 rounded text-xs font-bold uppercase tracking-widest btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCommitments}
                className="flex-1 py-2 rounded text-xs font-bold uppercase tracking-widest btn-primary"
              >
                Save & Lock
              </button>
            </div>
          )}
        </div>

        {/* Daily Targets Tracker */}
        {allTargets.length > 0 && (
          <div
            className="rounded-xl p-5 shadow-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="primary-text" />
                <span style={{ color: "var(--text)" }} className="text-sm font-semibold uppercase tracking-widest">
                  Active Targets
                </span>
              </div>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: completedTargetsCount === allTargets.length ? "#063e2b" : "var(--s2)",
                  color: completedTargetsCount === allTargets.length ? "#34D399" : "var(--faint)",
                  border: `1px solid ${completedTargetsCount === allTargets.length ? "#34D39944" : "var(--border)"}`,
                }}
              >
                {completedTargetsCount} / {allTargets.length} done
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {allTargets.map((target) => {
                const progress = targetProgress[target] || 0;
                const done = progress >= 100;
                const isCommitment = commitments.includes(target);
                return (
                  <div
                    key={target}
                    className="w-full text-left rounded-lg px-3 py-2.5 transition-all flex flex-col gap-2 group"
                    style={{
                      background: done ? "rgba(52, 211, 153, 0.1)" : "var(--s2)",
                      border: `1px solid ${done ? "rgba(52, 211, 153, 0.3)" : "var(--border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: done ? "#34D399" : "transparent",
                          border: `1.5px solid ${done ? "#34D399" : "var(--faint)"}`,
                        }}
                      >
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-xs truncate font-medium flex-1"
                        style={{ color: done ? "#34D399" : "var(--text)" }}
                      >
                        {target}
                      </span>
                      {isCommitment && (
                        <Star size={12} className="text-yellow-500 opacity-50" />
                      )}
                    </div>
                    {progress > 0 && !done && (
                      <div className="w-full pl-7">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px]" style={{ color: "var(--faint)" }}>Progress</span>
                          <span className="text-[10px] font-mono font-bold" style={{ color: "var(--primary)" }}>{progress}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full" style={{ width: `${progress}%`, background: "var(--primary)" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Link to Completed Targets if any exist */}
            {monthlyCompletedCount > 0 && (
              <button
                onClick={onViewTargets}
                className="w-full mt-3 p-2.5 rounded-lg border border-dashed flex items-center justify-between gap-2 text-xs transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 group"
                title="View completed targets in Goal Tracker"
              >
                <div className="flex items-center gap-2">
                  <Trophy size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">{monthlyCompletedCount} Accomplished Goal{monthlyCompletedCount > 1 ? "s" : ""}</span>
                </div>
                <span className="text-[10px] opacity-70 group-hover:opacity-100 flex items-center gap-1 font-mono">
                  View →
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Timeline & Stats */}
      <div>
        {/* Day stats bar */}
        <div
          className="rounded-xl p-5 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 shadow-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Stat label="Sessions Logged" value={`${loggedCount} / ${slots.length}`} color="#C9A84C" />
          <Stat label="Planned" value={loggedCount > 0 ? `${Math.round((plannedCount/loggedCount)*100)}%` : "—"} color="#4ADE80" />
          <Stat label="On Priority" value={loggedCount > 0 ? `${Math.round((priorityCount/loggedCount)*100)}%` : "—"} color="#60A5FA" />
          <Stat label="Avg Rating" value={String(avgSat)} color="#A78BFA" />
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {slots.map((slot) => {
            const block = blocks[slot.slotKey] || 
                          blocks[slot.startHour] || 
                          blocks[Math.floor(slot.startHour)] || 
                          (slot.startMinutes % 60 !== 0 ? blocks[Math.ceil(slot.startHour)] : null);
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const isCurrent = isToday && currentMinutes >= slot.startMinutes && currentMinutes < slot.endMinutes;
            const isPast = isToday && currentMinutes >= slot.endMinutes;
            
            // Get all mapped categories for the block
            const mappedCats = (block?.categories || []).map(cVal => categories.find((c) => c.value === cVal)).filter(Boolean) as typeof categories;
            // Fallback for background styling
            const mainCat = mappedCats[0];
            const routineItem = slot.routineItem;

            return (
              <div key={slot.id} className="flex gap-4 items-stretch">
                {/* Time label & Routine column */}
                <div 
                  className="w-24 sm:w-28 md:w-32 flex-shrink-0 flex flex-col items-end justify-start pt-3 pr-3"
                  style={{ 
                    borderRight: `2px solid ${routineItem ? "var(--primary)" : "var(--border)"}`,
                    opacity: routineItem ? 1 : 0.6
                  }}
                >
                  <div className="flex items-center gap-1.5 justify-end w-full">
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full animate-pulse shadow-sm shadow-[var(--primary)] inline-block shrink-0" style={{ background: "var(--primary)" }} />
                    )}
                    <span 
                      style={{ color: routineItem ? "var(--primary)" : "var(--text)" }} 
                      className="font-mono text-[11px] sm:text-xs font-bold text-right leading-tight tracking-tight"
                    >
                      {slot.timeLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 justify-end flex-wrap">
                    <span className="text-[10px] font-mono opacity-60">
                      {slot.durationLabel}
                    </span>
                  </div>
                  {routineItem && (
                    <span className="text-[9px] uppercase font-bold text-right mt-1 leading-tight tracking-wider" style={{ color: "var(--text)" }}>
                      {routineItem.activity}
                    </span>
                  )}
                </div>

                {/* Block card */}
                <div className="flex-1 min-w-0">
                  {block ? (
                    <button
                      onClick={() => onLogBlock(slot.startHour, slot.timeLabel, slot.durationLabel, routineItem?.activity)}
                      className="w-full text-left rounded-xl p-4 transition-all group hover:shadow-md"
                      style={{
                        background: mainCat?.bg ?? "var(--s2)",
                        border: `1px solid ${mainCat?.color ?? "var(--border)"}22`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {mappedCats.map((mc, idx) => (
                              <span key={idx} className="cat-badge" style={{ background: `${mc?.color}22`, color: mc?.color }}>
                                {mc?.emoji} {mc?.label}
                              </span>
                            ))}
                            {!block.wasPlanned && (
                              <span className="cat-badge" style={{ background: "#4a0d0d", color: "#F87171" }}>
                                Reactive
                              </span>
                            )}
                            {(block.contributedTargets || []).map((t, idx) => (
                              <span key={idx} className="cat-badge" style={{ background: "#063e2b", color: "#34D399" }}>
                                ✓ {t.name} ({t.percentage}%)
                              </span>
                            ))}
                          </div>
                          <p style={{ color: "var(--text)" }} className="text-base leading-snug truncate font-medium">{block.activity}</p>
                          {block.contribution && (
                            <p style={{ color: "var(--faint)" }} className="text-xs mt-1.5 truncate italic">
                              Contribution: {block.contribution}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} style={{ opacity: n <= block.satisfaction ? 1 : 0.15, fontSize: 10 }}>⭐</span>
                            ))}
                          </div>
                          <Edit2 size={12} style={{ color: "var(--faint)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => onLogBlock(slot.startHour, slot.timeLabel, slot.durationLabel, routineItem?.activity)}
                      className="w-full text-left rounded-xl p-4 transition-all group border-dashed"
                      style={{
                        background: isCurrent ? "var(--surface)" : "transparent",
                        borderWidth: 1,
                        borderColor: isCurrent ? "var(--gold)" : "var(--border)",
                        opacity: isPast ? 0.45 : 1,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCurrent ? <Plus size={16} className="primary-text" /> : <Plus size={16} style={{ color: "var(--faint)" }} />}
                          <span style={{ color: isCurrent ? "var(--gold)" : "var(--faint)" }} className="text-sm font-medium">
                            {isCurrent 
                              ? `Log current ${routineItem ? "routine" : "session"} (${slot.durationLabel})` 
                              : isPast 
                              ? `Unlogged ${routineItem ? "routine" : "time"} — tap to fill in (${slot.durationLabel})` 
                              : `Plan this ${routineItem ? "routine" : "window"} (${slot.durationLabel})`}
                          </span>
                        </div>
                        {routineItem && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/10 dark:bg-white/5 text-[var(--faint)] group-hover:text-[var(--text)] transition-colors">
                            {routineItem.activity}
                          </span>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Extend Day Button */}
        {onExtendDay && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onExtendDay}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: "var(--faint)",
                border: "1px dashed var(--border)",
              }}
            >
              <Plus size={14} />
              Add Extra Hour
            </button>
          </div>
        )}

        {/* Evening Review floating button */}
        {(loggedCount >= slots.length || hasEveningReview || currentHour >= 18) && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={onEveningReview}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{
                background: hasEveningReview ? "var(--surface)" : "var(--gold)",
                color: hasEveningReview ? "var(--gold)" : "#111",
                border: hasEveningReview ? "1px solid var(--gold)" : "none",
              }}
            >
              <Moon size={18} fill={hasEveningReview ? "none" : "currentColor"} />
              {hasEveningReview ? "Edit Evening Review" : "Close Today's Ledger"}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Mindset & Challenges */}
      <div className="hidden xl:block space-y-6 sticky top-24">
        {/* Target Rank Glance */}
        {targetRank && (
          <div className="rounded-xl p-5 shadow-sm border flex items-center justify-between" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div>
              <h3 className="font-semibold text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Monthly Target Rank</h3>
              <p className={`font-bold text-sm ${targetRank.rankColor}`}>{targetRank.rankLabel}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl font-black text-xl bg-black/5 dark:bg-white/5 border" style={{ borderColor: "var(--border)" }}>
              <span className={targetRank.rankColor}>{targetRank.rankStr}</span>
            </div>
          </div>
        )}


        {/* Active Challenge Glance */}
        {activeChallenge && (
          <div className="rounded-xl p-5 shadow-sm border overflow-hidden relative" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} className="text-orange-500" />
              <h3 className="font-semibold text-xs uppercase tracking-widest" style={{ color: "var(--text)" }}>Active Arc</h3>
            </div>
            
            <h4 className="text-xl font-black tracking-tight mb-1">{activeChallenge.name}</h4>
            
            {(() => {
              const start = new Date(activeChallenge.startDate);
              const today = new Date();
              const daysElapsed = differenceInDays(today, start);
              const progressPct = Math.min(100, Math.max(0, (daysElapsed / activeChallenge.durationDays) * 100));
              
              let phase = 1;
              if (progressPct > 33 && progressPct <= 66) phase = 2;
              if (progressPct > 66) phase = 3;

              return (
                <div>
                  <div className="flex items-center justify-between mt-3 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                      Phase {phase} • Day {Math.max(0, daysElapsed + 1)}
                    </span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: "var(--primary)" }}>
                      {progressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden mb-4" style={{ background: "var(--s2)" }}>
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  
                  {activeChallenge.goals.length > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--s2)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Core Commitments</p>
                      <ul className="space-y-3">
                        {activeChallenge.goals.map((g, i) => {
                          const mappedTargets = activeChallenge.targetMapping?.[g] || [];
                          const hasMappedTargets = mappedTargets.length > 0;
                          return (
                            <li key={i} className="text-xs flex flex-col gap-1.5" style={{ color: "var(--text)" }}>
                              <div className="flex items-start gap-1.5 font-medium">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                {g}
                              </div>
                              {hasMappedTargets && (
                                <ul className="pl-3 space-y-1.5 mt-0.5">
                                  {mappedTargets.map(tName => {
                                    const isDone = dayTargets[tName];
                                    return (
                                      <li key={tName} className="flex items-center gap-1.5 text-[10px]" style={{ color: isDone ? "var(--emerald-500)" : "var(--faint)" }}>
                                        <span className="opacity-50">↳</span>
                                        {isDone ? (
                                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-emerald-500 flex-shrink-0">
                                            <rect width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.2"/>
                                            <path d="M3 6L5.5 8.5L9 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        ) : (
                                          <div className="w-2.5 h-2.5 rounded-[2px] border flex-shrink-0" style={{ borderColor: "var(--faint)" }} />
                                        )}
                                        <span className={isDone ? "line-through opacity-80 truncate" : "truncate"}>{tName}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{ color: "var(--muted)" }} className="text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-mono font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
