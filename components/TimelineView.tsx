"use client";
import { TimeBlock, DaySetup, CATEGORIES } from "@/lib/types";
import { Plus, Edit2, Moon, CheckSquare, Star } from "lucide-react";
import { SyncState } from "@/lib/types";

interface Props {
  date:          string;
  setup:         DaySetup;
  blocks:        { [hour: number]: TimeBlock };
  syncState:     SyncState;
  onLogBlock:    (hour: number) => void;
  onEveningReview: () => void;
  hasEveningReview: boolean;
  dayTargets: Record<string, boolean>;
  allTargets: string[];
  onToggleTarget: (targetName: string) => void;
  onUpdateCommitments?: (tasks: [string, string, string]) => void;
}

const toTime = (h: number) => {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00`;
};

const nowHour = () => new Date().getHours();

export default function TimelineView({
  date, setup, blocks, onLogBlock, onEveningReview, hasEveningReview, 
  dayTargets, allTargets, onToggleTarget, onUpdateCommitments
}: Props) {
  const hours = Array.from(
    { length: Math.max(1, (setup.sleepHour > setup.wakeHour
      ? setup.sleepHour - setup.wakeHour
      : 24 - setup.wakeHour + setup.sleepHour)) },
    (_, i) => (setup.wakeHour + i) % 24
  );

  const currentHour = nowHour();
  const isToday = date === new Date().toISOString().split("T")[0];
  const loggedCount  = Object.keys(blocks).length;
  const plannedCount = Object.values(blocks).filter((b) => b.wasPlanned).length;
  const priorityCount = Object.values(blocks).filter((b) => b.contributedPriority ? b.contributedPriority !== "None" : b.contributedToTopPriority).length;
  const avgSat = loggedCount > 0
    ? (Object.values(blocks).reduce((a, b) => a + b.satisfaction, 0) / loggedCount).toFixed(1)
    : "—";

  const completedTargetsCount = allTargets.reduce((count, t) => count + (dayTargets[t] ? 1 : 0), 0);
  const commitments = setup.tasks || ["", "", ""];
  
  const handleSelectCommitment = (index: number, value: string) => {
    if (!onUpdateCommitments) return;
    const newComm = [...commitments] as [string, string, string];
    newComm[index] = value;
    onUpdateCommitments(newComm);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-start">
      
      {/* LEFT COLUMN: Targets & Commitments */}
      <div className="space-y-6 lg:sticky lg:top-24">
        
        {/* Top 3 Commitments */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-yellow-500" />
            <h3 className="font-semibold text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>Top 3 Commitments</h3>
          </div>
          <p className="text-xs mb-4 italic" style={{ color: "var(--faint)" }}>Select 3 targets to prioritize today.</p>
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col bg-opacity-50 rounded-lg p-2" style={{ background: "var(--s2)" }}>
                <select
                  value={commitments[i]}
                  onChange={(e) => handleSelectCommitment(i, e.target.value)}
                  className="text-sm rounded border-none focus:ring-1 focus:ring-[var(--gold)] w-full font-medium"
                  style={{ background: "transparent", color: commitments[i] ? "var(--text)" : "var(--faint)", padding: "4px" }}
                >
                  <option value="">-- Select a Target --</option>
                  {allTargets.map(t => (
                    <option key={t} value={t} disabled={commitments.includes(t) && commitments[i] !== t}>
                      {t}
                    </option>
                  ))}
                </select>
                {commitments[i] && (
                  <div className="mt-2 ml-1.5 flex items-center gap-2 text-xs">
                    <button 
                      onClick={() => onToggleTarget(commitments[i])}
                      className="w-4 h-4 flex items-center justify-center rounded border transition-colors"
                      style={{
                        background: dayTargets[commitments[i]] ? "#34D399" : "transparent",
                        borderColor: dayTargets[commitments[i]] ? "#34D399" : "var(--faint)"
                      }}
                    >
                      {dayTargets[commitments[i]] && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span style={{ color: dayTargets[commitments[i]] ? "#34D399" : "var(--muted)" }}>
                      {dayTargets[commitments[i]] ? "Completed" : "Mark as completed"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
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
                  All Targets
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
                const done = dayTargets[target] || false;
                const isCommitment = commitments.includes(target);
                return (
                  <button
                    key={target}
                    onClick={() => onToggleTarget(target)}
                    className="w-full text-left rounded-lg px-3 py-2.5 transition-all flex items-center gap-3 group"
                    style={{
                      background: done ? "rgba(52, 211, 153, 0.1)" : "var(--s2)",
                      border: `1px solid ${done ? "rgba(52, 211, 153, 0.3)" : "var(--border)"}`,
                    }}
                  >
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
                  </button>
                );
              })}
            </div>
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
          <Stat label="Hours Logged" value={`${loggedCount} / ${hours.length}`} color="#C9A84C" />
          <Stat label="Planned" value={loggedCount > 0 ? `${Math.round((plannedCount/loggedCount)*100)}%` : "—"} color="#4ADE80" />
          <Stat label="On Priority" value={loggedCount > 0 ? `${Math.round((priorityCount/loggedCount)*100)}%` : "—"} color="#60A5FA" />
          <Stat label="Avg Rating" value={String(avgSat)} color="#A78BFA" />
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {hours.map((hour) => {
            const block = blocks[hour];
            const isPast  = isToday && hour < currentHour;
            const isCurrent = isToday && hour === currentHour;
            const cat   = block ? CATEGORIES.find((c) => c.value === block.category)! : null;

            return (
              <div key={hour} className="flex gap-4 items-stretch">
                {/* Time label */}
                <div className="w-14 flex-shrink-0 flex flex-col items-end justify-start pt-3">
                  <span style={{ color: "var(--faint)" }} className="font-mono text-xs">{toTime(hour)}</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full mt-2 pulse-dot" style={{ background: "var(--gold)" }} />
                  )}
                </div>

                {/* Block card */}
                <div className="flex-1 min-w-0">
                  {block ? (
                    <button
                      onClick={() => onLogBlock(hour)}
                      className="w-full text-left rounded-xl p-4 transition-all group hover:shadow-md"
                      style={{
                        background: cat?.bg ?? "var(--s2)",
                        border: `1px solid ${cat?.color ?? "var(--border)"}22`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="cat-badge" style={{ background: `${cat?.color}22`, color: cat?.color }}>
                              {cat?.emoji} {cat?.label}
                            </span>
                            {!block.wasPlanned && (
                              <span className="cat-badge" style={{ background: "#4a0d0d", color: "#F87171" }}>
                                Reactive
                              </span>
                            )}
                            {(block.contributedPriority && block.contributedPriority !== "None") ? (
                              <span className="cat-badge" style={{ background: "#063e2b", color: "#34D399" }}>
                                ✓ {block.contributedPriority}
                              </span>
                            ) : (
                              block.contributedToTopPriority && (
                                <span className="cat-badge" style={{ background: "#063e2b", color: "#34D399" }}>
                                  ✓ P1
                                </span>
                              )
                            )}
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
                      onClick={() => onLogBlock(hour)}
                      className="w-full text-left rounded-xl p-4 transition-all group border-dashed"
                      style={{
                        background: isCurrent ? "var(--surface)" : "transparent",
                        borderWidth: 1,
                        borderColor: isCurrent ? "var(--gold)" : "var(--border)",
                        opacity: isPast ? 0.4 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent ? <Plus size={16} className="primary-text" /> : <Plus size={16} style={{ color: "var(--faint)" }} />}
                        <span style={{ color: isCurrent ? "var(--gold)" : "var(--faint)" }} className="text-sm font-medium">
                          {isCurrent ? "Log current hour" : isPast ? "Unlogged hour — tap to fill in" : "Plan this hour"}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Evening Review floating button */}
        {(loggedCount === hours.length || hasEveningReview || currentHour >= 18) && (
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
