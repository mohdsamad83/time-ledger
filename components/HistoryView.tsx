"use client";
import { AppData, CATEGORIES } from "@/lib/types";
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
        <p className="font-serif text-3xl text-[#EDE8DC] mb-3">No history yet</p>
        <p className="text-[#5C5247] text-sm">Your logged days will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <h2 className="font-serif text-3xl text-[#EDE8DC] mb-1">History</h2>
      <p className="text-[#5C5247] text-sm mb-8">{dates.length} days logged</p>

      <div className="space-y-3">
        {dates.map((date) => {
          const day    = data.days[date];
          const blocks = Object.values(day.blocks);
          const avgSat = blocks.length > 0
            ? (blocks.reduce((a, b) => a + b.satisfaction, 0) / blocks.length).toFixed(1)
            : null;

          // Category pills (top 3)
          const catCounts: { [k: string]: number } = {};
          blocks.forEach((b) => { catCounts[b.category] = (catCounts[b.category] ?? 0) + 1; });
          const topCats = Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => CATEGORIES.find((c) => c.value === cat)!);

          const dayOfWeek  = format(parseISO(date), "EEEE");
          const dateLabel  = format(parseISO(date), "MMMM d, yyyy");
          const rating     = day.eveningReview?.overallRating;
          const topPri     = day.setup?.topPriority;
          const accomplished = day.eveningReview?.topPriorityAccomplished;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className="w-full text-left rounded-xl p-4 transition-all group hover:border-[#7A6228]"
              style={{ background: "#17150F", border: "1px solid #2A261A" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif text-[#EDE8DC] text-lg">{dayOfWeek}</span>
                    <span className="text-[#5C5247] text-sm">{dateLabel}</span>
                  </div>

                  {topPri && (
                    <p className="text-xs text-[#A09580] truncate mb-2">
                      🎯 {topPri}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-[#5C5247]">
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
                    <span className="font-mono text-lg font-semibold text-[#C9A84C]">
                      {rating}/10
                    </span>
                  )}
                  {avgSat && (
                    <span className="text-xs text-[#5C5247]">⭐ {avgSat} avg</span>
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
