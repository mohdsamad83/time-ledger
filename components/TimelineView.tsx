"use client";
import { useState } from "react";
import { TimeBlock, DaySetup, CATEGORIES } from "@/lib/types";
import { Plus, Edit2, Moon, AlertTriangle, TrendingUp, Clock, CheckSquare, LayoutTemplate } from "lucide-react";
import { SyncState } from "@/lib/types";
import { ScheduleTemplate } from "@/lib/templates";
import TemplateModal from "@/components/TemplateModal";

interface Props {
  date:          string;
  setup:         DaySetup;
  blocks:        { [hour: number]: TimeBlock };
  syncState:     SyncState;
  onLogBlock:    (hour: number) => void;
  onEveningReview: () => void;
  hasEveningReview: boolean;
  onToggleTask:  (taskIndex: number) => void;
  onApplyTemplate: (template: ScheduleTemplate) => void;
}

const toTime = (h: number) => {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00`;
};

const nowHour = () => new Date().getHours();

const COMMITMENT_BADGES = [
  { label: "P1", color: "#F87171", bg: "#4a0d0d" },
  { label: "P2", color: "#FCD34D", bg: "#4a3800" },
  { label: "P3", color: "#60A5FA", bg: "#1e3a5f" },
];

export default function TimelineView({
  date, setup, blocks, syncState, onLogBlock, onEveningReview, hasEveningReview, onToggleTask, onApplyTemplate,
}: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
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
  const priorityCount = Object.values(blocks).filter((b) => b.contributedToTopPriority).length;
  const avgSat = loggedCount > 0
    ? (Object.values(blocks).reduce((a, b) => a + b.satisfaction, 0) / loggedCount).toFixed(1)
    : "—";

  const catTotals: { [k: string]: number } = {};
  Object.values(blocks).forEach((b) => {
    catTotals[b.category] = (catTotals[b.category] ?? 0) + 1;
  });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topCatInfo = topCat ? CATEGORIES.find((c) => c.value === topCat[0]) : null;

  // Commitment tracking
  const tasksCompleted = setup.tasksCompleted ?? [false, false, false];
  const filledTasks = setup.tasks.filter((t) => t.trim().length > 0);
  const completedCount = filledTasks.reduce((count, _, i) => count + (tasksCompleted[i] ? 1 : 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">

      {/* Day stats bar */}
      <div
        className="rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Stat label="Hours Logged" value={`${loggedCount} / ${hours.length}`} color="#C9A84C" />
        <Stat label="Planned" value={loggedCount > 0 ? `${Math.round((plannedCount/loggedCount)*100)}%` : "—"} color="#4ADE80" />
        <Stat label="On Priority" value={loggedCount > 0 ? `${Math.round((priorityCount/loggedCount)*100)}%` : "—"} color="#60A5FA" />
        <Stat label="Avg Rating" value={String(avgSat)} color="#A78BFA" />
      </div>

      {/* Templates shortcut button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{
            background: "var(--s2)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            fontFamily: "var(--font-lato), sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--gold)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--dim)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          }}
        >
          <LayoutTemplate size={12} />
          <span>Load Template</span>
        </button>
      </div>



      {/* ── Commitments Tracker ────────────────────────────────────────────── */}
      {filledTasks.length > 0 && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} style={{ color: "var(--gold)" }} />
              <span style={{ color: "var(--text)" }} className="text-sm font-serif font-semibold">
                Top 3 Priorities
              </span>
            </div>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{
                background: completedCount === filledTasks.length ? "#063e2b" : "var(--s2)",
                color: completedCount === filledTasks.length ? "#34D399" : "var(--faint)",
                border: `1px solid ${completedCount === filledTasks.length ? "#34D39944" : "var(--border)"}`,
              }}
            >
              {completedCount} / {filledTasks.length} done
            </span>
          </div>
          <p className="drucker-highlight text-xs mb-3" style={{ marginTop: 0 }}>
            Drucker: "Concentrate on the few major areas where superior performance will produce outstanding results."
          </p>
          <div className="space-y-2">
            {setup.tasks.map((task, i) => {
              if (!task.trim()) return null;
              const badge = COMMITMENT_BADGES[i];
              const done = tasksCompleted[i];
              return (
                <button
                  key={i}
                  onClick={() => onToggleTask(i)}
                  className="w-full text-left rounded-lg px-3.5 py-3 transition-all flex items-center gap-3 group"
                  style={{
                    background: done ? "#063e2b" : "var(--s2)",
                    border: `1px solid ${done ? "#34D39944" : "var(--border)"}`,
                  }}
                >
                  {/* Checkbox */}
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: done ? "#34D399" : "transparent",
                      border: `2px solid ${done ? "#34D399" : "var(--dim)"}`,
                    }}
                  >
                    {done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#063e2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span
                      className="cat-badge text-[10px]"
                      style={{ background: `${badge.color}22`, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <span
                      className="text-sm truncate"
                      style={{
                        color: done ? "#34D399" : "var(--text)",
                        textDecoration: done ? "line-through" : "none",
                        opacity: done ? 0.7 : 1,
                      }}
                    >
                      {task}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        {hours.map((hour) => {
          const block = blocks[hour];
          const isPast  = isToday && hour < currentHour;
          const isCurrent = isToday && hour === currentHour;
          const cat   = block ? CATEGORIES.find((c) => c.value === block.category)! : null;

          return (
            <div key={hour} className="flex gap-3 items-stretch">
              {/* Time label */}
              <div className="w-14 flex-shrink-0 flex flex-col items-end justify-start pt-3">
                <span style={{ color: "var(--faint)" }} className="font-mono text-xs">{toTime(hour)}</span>
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full mt-1 pulse-dot" style={{ background: "var(--gold)" }} />
                )}
              </div>

              {/* Block card */}
              <div className="flex-1 min-w-0">
                {block ? (
                  /* Logged block */
                  <button
                    onClick={() => onLogBlock(hour)}
                    className="w-full text-left rounded-lg p-3.5 transition-all group"
                    style={{
                      background: cat?.bg ?? "var(--s2)",
                      border: `1px solid ${cat?.color ?? "var(--border)"}22`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="cat-badge"
                            style={{ background: `${cat?.color}22`, color: cat?.color }}
                          >
                            {cat?.emoji} {cat?.label}
                          </span>
                          {!block.wasPlanned && (
                            <span className="cat-badge" style={{ background: "#4a0d0d", color: "#F87171" }}>
                              Reactive
                            </span>
                          )}
                          {block.contributedToTopPriority && (
                            <span className="cat-badge" style={{ background: "#063e2b", color: "#34D399" }}>
                              ✓ Priority
                            </span>
                          )}
                        </div>
                        <p style={{ color: "var(--text)" }} className="text-sm leading-snug truncate">{block.activity}</p>
                        {block.contribution && (
                          <p style={{ color: "var(--faint)" }} className="text-xs mt-1 truncate italic">
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
                        <Edit2
                          size={12}
                          style={{ color: "var(--faint)" }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>
                    {block.syncedAt === null && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                        <span style={{ color: "var(--faint)" }} className="text-[10px]">Not synced to Sheets</span>
                      </div>
                    )}
                  </button>
                ) : isPast ? (
                  /* Past unlogged */
                  <button
                    onClick={() => onLogBlock(hour)}
                    className="w-full text-left rounded-lg p-3 transition-all flex items-center gap-2"
                    style={{ background: "var(--s2)", border: "1px solid #F8717140" }}
                  >
                    <AlertTriangle size={12} style={{ color: "#F87171", flexShrink: 0 }} />
                    <span style={{ color: "#F87171" }} className="text-xs">Unlogged hour — tap to fill in</span>
                  </button>
                ) : (
                  /* Future / current */
                  <button
                    onClick={() => onLogBlock(hour)}
                    className="w-full text-left rounded-lg p-3 transition-all flex items-center gap-2 group"
                    style={{ background: "var(--s2)", border: "1px dashed var(--border)" }}
                  >
                    <Plus size={14} style={{ color: "var(--faint)" }} className="group-hover:text-[var(--gold)] transition-colors" />
                    <span style={{ color: "var(--faint)" }} className="text-xs group-hover:text-[var(--muted)] transition-colors">
                      {isCurrent ? "You're here — log this hour" : "Log this hour"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Sleep */}
        <div className="flex gap-3 items-center">
          <div className="w-14 flex-shrink-0 flex justify-end">
            <span style={{ color: "var(--faint)" }} className="font-mono text-xs">{toTime(setup.sleepHour)}</span>
          </div>
          <div
            className="flex-1 rounded-lg p-3 flex items-center gap-2"
            style={{ background: "var(--s2)", border: "1px solid var(--border)" }}
          >
            <Moon size={12} style={{ color: "var(--faint)" }} />
            <span style={{ color: "var(--faint)" }} className="text-xs">Sleep — end of ledger</span>
          </div>
        </div>
      </div>

      {/* Evening review CTA */}
      <div className="mt-8">
        <button
          onClick={onEveningReview}
          className="w-full rounded-xl p-5 text-left transition-all group"
          style={{
            background: hasEveningReview ? "#063e2b" : "var(--surface)",
            border: `1px solid ${hasEveningReview ? "#34D399" : "var(--border)"}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: "var(--text)" }} className="font-serif text-lg">
                {hasEveningReview ? "✓ Evening Review Done" : "Evening Review"}
              </p>
              <p style={{ color: "var(--faint)" }} className="text-xs mt-1">
                {hasEveningReview
                  ? "Click to edit your reflections"
                  : "Drucker: \"What did I actually accomplish? What was wasted time?\""}
              </p>
            </div>
            <Moon size={20} style={{ color: hasEveningReview ? "#34D399" : "var(--border)" }}
              className="group-hover:text-[var(--gold)] transition-colors" />
          </div>
        </button>
      </div>

      {/* ── Template Modal ── */}
      {showTemplates && (
        <TemplateModal
          onApply={(tpl) => {
            onApplyTemplate(tpl);
            setShowTemplates(false);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{ color: "var(--faint)" }} className="text-xs uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className="font-mono text-lg font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
