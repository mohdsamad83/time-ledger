"use client";
import { TimeBlock, DaySetup, CATEGORIES } from "@/lib/types";
import { Plus, Edit2, Moon, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { SyncState } from "@/lib/types";
import clsx from "clsx";

interface Props {
  date:          string;
  setup:         DaySetup;
  blocks:        { [hour: number]: TimeBlock };
  syncState:     SyncState;
  onLogBlock:    (hour: number) => void;
  onEveningReview: () => void;
  hasEveningReview: boolean;
}

const toTime = (h: number) => {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00`;
};

const nowHour = () => new Date().getHours();

export default function TimelineView({
  date, setup, blocks, syncState, onLogBlock, onEveningReview, hasEveningReview,
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

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">

      {/* Day stats bar */}
      <div
        className="rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ background: "#17150F", border: "1px solid #2A261A" }}
      >
        <Stat label="Hours Logged" value={`${loggedCount} / ${hours.length}`} color="#C9A84C" />
        <Stat label="Planned" value={loggedCount > 0 ? `${Math.round((plannedCount/loggedCount)*100)}%` : "—"} color="#4ADE80" />
        <Stat label="On Priority" value={loggedCount > 0 ? `${Math.round((priorityCount/loggedCount)*100)}%` : "—"} color="#60A5FA" />
        <Stat label="Avg Rating" value={String(avgSat)} color="#A78BFA" />
      </div>

      {/* Top priority reminder */}
      <div
        className="rounded-lg px-4 py-3 mb-5 flex items-start gap-3"
        style={{ background: "#1E1B13", border: "1px solid #7A6228" }}
      >
        <TrendingUp size={14} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-[#5C5247] text-xs font-bold uppercase tracking-widest">Today's #1 Priority</span>
          <p className="text-[#EDE8DC] text-sm mt-0.5">{setup.topPriority}</p>
        </div>
      </div>

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
                <span className="font-mono text-xs text-[#5C5247]">{toTime(hour)}</span>
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full mt-1 pulse-dot" style={{ background: "#C9A84C" }} />
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
                      background: cat?.bg ?? "#1E1B13",
                      border: `1px solid ${cat?.color ?? "#2A261A"}22`,
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
                        <p className="text-[#EDE8DC] text-sm leading-snug truncate">{block.activity}</p>
                        {block.contribution && (
                          <p className="text-[#5C5247] text-xs mt-1 truncate italic">
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
                          className="text-[#5C5247] opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>
                    {block.syncedAt === null && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                        <span className="text-[10px] text-[#5C5247]">Not synced to Sheets</span>
                      </div>
                    )}
                  </button>
                ) : isPast ? (
                  /* Past unlogged */
                  <button
                    onClick={() => onLogBlock(hour)}
                    className="w-full text-left rounded-lg p-3 transition-all flex items-center gap-2"
                    style={{ background: "#1a0f0f", border: "1px solid #4a1a1a" }}
                  >
                    <AlertTriangle size={12} className="text-[#F87171] flex-shrink-0" />
                    <span className="text-[#F87171] text-xs">Unlogged hour — tap to fill in</span>
                  </button>
                ) : (
                  /* Future / current */
                  <button
                    onClick={() => onLogBlock(hour)}
                    className="w-full text-left rounded-lg p-3 transition-all flex items-center gap-2 group"
                    style={{ background: "#1E1B13", border: "1px dashed #2A261A" }}
                  >
                    <Plus size={14} className="text-[#5C5247] group-hover:text-[#C9A84C] transition-colors" />
                    <span className="text-[#5C5247] text-xs group-hover:text-[#A09580] transition-colors">
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
            <span className="font-mono text-xs text-[#5C5247]">{toTime(setup.sleepHour)}</span>
          </div>
          <div
            className="flex-1 rounded-lg p-3 flex items-center gap-2"
            style={{ background: "#1E1B13", border: "1px solid #2A261A" }}
          >
            <Moon size={12} className="text-[#5C5247]" />
            <span className="text-[#5C5247] text-xs">Sleep — end of ledger</span>
          </div>
        </div>
      </div>

      {/* Evening review CTA */}
      <div className="mt-8">
        <button
          onClick={onEveningReview}
          className="w-full rounded-xl p-5 text-left transition-all group"
          style={{
            background: hasEveningReview ? "#063e2b" : "#17150F",
            border: `1px solid ${hasEveningReview ? "#34D399" : "#2A261A"}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg text-[#EDE8DC]">
                {hasEveningReview ? "✓ Evening Review Done" : "Evening Review"}
              </p>
              <p className="text-xs text-[#5C5247] mt-1">
                {hasEveningReview
                  ? "Click to edit your reflections"
                  : "Drucker: \"What did I actually accomplish? What was wasted time?\""}
              </p>
            </div>
            <Moon size={20} className={hasEveningReview ? "text-[#34D399]" : "text-[#2A261A] group-hover:text-[#C9A84C]"} />
          </div>
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[#5C5247] text-xs uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className="font-mono text-lg font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
