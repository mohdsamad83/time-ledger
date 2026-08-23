"use client";
import { AppData, DEFAULT_CATEGORIES } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface Props {
  data:         AppData;
  onSelectDate: (date: string) => void;
}

export default function HistoryView({ data, onSelectDate }: Props) {
  const dates = Object.keys(data.days).sort().reverse();

  if (dates.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "var(--text)" }} className="font-serif text-3xl mb-3">No history yet</p>
        <p style={{ color: "var(--faint)" }} className="text-sm">Your logged days will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <h2 style={{ color: "var(--text)" }} className="font-serif text-3xl mb-1">History</h2>
      <p style={{ color: "var(--faint)" }} className="text-sm mb-8">{dates.length} days logged</p>

      <div className="space-y-3">
        {dates.map((date) => {
          const day    = data.days[date];
          const blocks = Object.values(day.blocks);
          const avgSat = blocks.length > 0
            ? (blocks.reduce((a, b) => a + b.satisfaction, 0) / blocks.length).toFixed(1)
            : null;

          // Category pills (top 3)
          const catCounts: { [k: string]: number } = {};
          blocks.forEach((b) => { 
            const cats = b.categories || (b.category ? [b.category] : []);
            cats.forEach(c => {
              if (c) catCounts[c] = (catCounts[c] ?? 0) + 1; 
            });
          });
          const fallbackCat = { label: "Unknown", color: "#9CA3AF", emoji: "📦", value: "unknown", bg: "rgba(156, 163, 175, 0.1)" };
            const activeCats = data.categories || DEFAULT_CATEGORIES;
            const topCats = Object.entries(catCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([cat]) => activeCats.find((c) => c.value === cat) || { ...fallbackCat, label: cat });

          const dayOfWeek  = format(parseISO(date), "EEEE");
          const dateLabel  = format(parseISO(date), "MMMM d, yyyy");
          const rating     = day.eveningReview?.overallRating;
          const topPri     = day.setup?.topPriority;
          const accomplished = day.eveningReview?.topPriorityAccomplished;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className="w-full text-left rounded-xl p-4 transition-all group"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dim)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: "var(--text)" }} className="font-serif text-lg">{dayOfWeek}</span>
                    <span style={{ color: "var(--faint)" }} className="text-sm">{dateLabel}</span>
                  </div>

                  {topPri && (
                    <p style={{ color: "var(--muted)" }} className="text-xs truncate mb-2">
                      🎯 {topPri}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: "var(--faint)" }} className="font-mono text-xs">
                      {blocks.length}h logged
                    </span>
                    {topCats.map((cat) => (
                      <span
                        key={cat.value}
                        className="cat-badge"
                        style={{ background: `${cat.color}22`, color: cat.color }}
                      >
                        {cat.emoji} {catCounts[cat.value]}h
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {rating != null && (
                    <span style={{ color: "var(--gold)" }} className="font-mono text-lg font-semibold">
                      {rating}/10
                    </span>
                  )}
                  {avgSat && (
                    <span style={{ color: "var(--faint)" }} className="text-xs">⭐ {avgSat} avg</span>
                  )}
                  {accomplished != null && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: accomplished ? "#063e2b" : "#4a0d0d",
                        color:      accomplished ? "#34D399" : "#F87171",
                      }}
                    >
                      {accomplished ? "✓ Priority done" : "✗ Priority missed"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
