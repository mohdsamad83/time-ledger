"use client";
import { AppData, CATEGORIES } from "@/lib/types";
import { parseISO, format } from "date-fns";

interface Props { data: AppData }

export default function InsightsView({ data }: Props) {
  const allDates = Object.keys(data.days).sort().reverse();
  const days7 = allDates.slice(0, 7);

  if (days7.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "var(--text)" }} className="font-serif text-3xl mb-3">No data yet</p>
        <p style={{ color: "var(--faint)" }} className="text-sm">Start logging your hours to see insights here.</p>
      </div>
    );
  }

  // ── Category breakdown (last 7 days) ──────────────────────────────────────
  const catHours: { [k: string]: number } = {};
  let totalHours = 0;
  for (const d of days7) {
    const day = data.days[d];
    for (const block of Object.values(day.blocks)) {
      catHours[block.category] = (catHours[block.category] ?? 0) + 1;
      totalHours++;
    }
  }

  // ── Satisfaction trend ────────────────────────────────────────────────────
  const satByDay = days7.slice(0, 7).reverse().map((d) => {
    const blocks = Object.values(data.days[d].blocks);
    const avg = blocks.length > 0
      ? blocks.reduce((a, b) => a + b.satisfaction, 0) / blocks.length
      : null;
    return { date: d, avg };
  });

  // ── Drucker metrics ───────────────────────────────────────────────────────
  let totalBlocks = 0, plannedBlocks = 0, priorityBlocks = 0, delegateBlocks = 0;
  for (const d of days7) {
    for (const block of Object.values(data.days[d].blocks)) {
      totalBlocks++;
      if (block.wasPlanned) plannedBlocks++;
      if (block.contributedPriority ? block.contributedPriority !== "None" : block.contributedToTopPriority) priorityBlocks++;
      if (block.couldDelegate === "yes") delegateBlocks++;
    }
  }

  const pct = (n: number) => totalBlocks > 0 ? Math.round((n / totalBlocks) * 100) : 0;

  // ── Priority accomplishment rate ──────────────────────────────────────────
  const eveningDays = days7.filter((d) => data.days[d].eveningReview);
  const accomplished = eveningDays.filter((d) => data.days[d].eveningReview?.topPriorityAccomplished).length;
  const accomplishRate = eveningDays.length > 0 ? Math.round((accomplished / eveningDays.length) * 100) : null;

  // ── Meeting time warning ──────────────────────────────────────────────────
  const meetingHours = catHours["meetings"] ?? 0;
  const meetingPct   = totalHours > 0 ? Math.round((meetingHours / totalHours) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <h2 style={{ color: "var(--text)" }} className="font-serif text-3xl mb-1">Insights</h2>
      <p style={{ color: "var(--faint)" }} className="text-sm mb-8">Last 7 days · {totalHours} hours logged</p>

      {/* Drucker Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <ScoreCard
          label="Planned Time"
          value={`${pct(plannedBlocks)}%`}
          sub="of hours were intentional"
          color={pct(plannedBlocks) >= 70 ? "#4ADE80" : pct(plannedBlocks) >= 50 ? "#FCD34D" : "#F87171"}
        />
        <ScoreCard
          label="Priority Focus"
          value={`${pct(priorityBlocks)}%`}
          sub="hours on your #1 priority"
          color={pct(priorityBlocks) >= 30 ? "#4ADE80" : "#FCD34D"}
        />
        <ScoreCard
          label="Delegation Leak"
          value={`${pct(delegateBlocks)}%`}
          sub="hours you could delegate"
          color={pct(delegateBlocks) <= 10 ? "#4ADE80" : pct(delegateBlocks) <= 25 ? "#FCD34D" : "#F87171"}
        />
        {accomplishRate !== null && (
          <ScoreCard
            label="Priority Win Rate"
            value={`${accomplishRate}%`}
            sub={`of ${eveningDays.length} reviewed days`}
            color={accomplishRate >= 70 ? "#4ADE80" : "#FCD34D"}
          />
        )}
      </div>

      {/* Category breakdown */}
      <Section title="⏱  Where Your Time Goes" subtitle="Last 7 days">
        <div className="space-y-2.5">
          {CATEGORIES.filter((c) => (catHours[c.value] ?? 0) > 0)
            .sort((a, b) => (catHours[b.value] ?? 0) - (catHours[a.value] ?? 0))
            .map((cat) => {
              const hrs  = catHours[cat.value] ?? 0;
              const frac = totalHours > 0 ? hrs / totalHours : 0;
              return (
                <div key={cat.value} className="flex items-center gap-3">
                  <span className="w-5 text-sm">{cat.emoji}</span>
                  <span style={{ color: "var(--muted)" }} className="text-xs w-32 truncate">{cat.label}</span>
                  <div className="flex-1 rounded-full overflow-hidden h-2" style={{ background: "var(--s2)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${frac * 100}%`, background: cat.color }}
                    />
                  </div>
                  <span style={{ color: "var(--text)" }} className="font-mono text-xs w-10 text-right">
                    {hrs}h
                  </span>
                  <span style={{ color: "var(--faint)" }} className="font-mono text-xs w-8 text-right">
                    {Math.round(frac * 100)}%
                  </span>
                </div>
              );
            })}
        </div>
      </Section>

      {/* Meeting time warning */}
      {meetingPct > 30 && (
        <div
          className="rounded-lg p-4 mb-6 flex gap-3"
          style={{ background: "var(--s2)", border: "1px solid #7C3AED55" }}
        >
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-[#A78BFA]">Meeting-Heavy Week</p>
            <p style={{ color: "var(--faint)" }} className="text-xs mt-1">
              {meetingPct}% of your time was in meetings ({meetingHours}h). Drucker warns: "Meetings are a symptom of bad organisation." Consider cutting, batching, or declining.
            </p>
          </div>
        </div>
      )}

      {/* Satisfaction trend */}
      <Section title="⭐  Satisfaction Trend" subtitle="Daily average rating">
        <div className="flex items-end gap-2 h-24">
          {satByDay.map(({ date, avg }) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 flex items-end w-full">
                {avg !== null ? (
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${(avg / 5) * 80}px`,
                      background: avg >= 4 ? "#4ADE80" : avg >= 3 ? "#FCD34D" : "#F87171",
                      opacity: 0.8,
                    }}
                  />
                ) : (
                  <div className="w-full rounded-t" style={{ height: "4px", background: "var(--s2)" }} />
                )}
              </div>
              <span style={{ color: "var(--faint)" }} className="text-[9px] font-mono">
                {format(parseISO(date), "EEE")}
              </span>
              <span style={{ color: "var(--muted)" }} className="text-[9px] font-mono">
                {avg !== null ? avg.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Drucker Principles Checklist */}
      <Section title="📖  Drucker Principles Check" subtitle="Based on your patterns">
        <div className="space-y-3">
          {[
            {
              principle: "Know where your time goes",
              check: totalHours >= days7.length * 4,
              pass: `You logged ${totalHours} hours across ${days7.length} days — solid tracking.`,
              fail: `You averaged ${(totalHours / days7.length).toFixed(1)} hours/day logged. Track more consistently.`,
            },
            {
              principle: "Focus on contribution",
              check: pct(priorityBlocks) >= 25,
              pass: `${pct(priorityBlocks)}% of your time went toward your #1 priority. Good focus.`,
              fail: `Only ${pct(priorityBlocks)}% of hours contributed to your top priority. Protect that time.`,
            },
            {
              principle: "Make time productive, not just busy",
              check: pct(plannedBlocks) >= 60,
              pass: `${pct(plannedBlocks)}% of your time was intentional and planned.`,
              fail: `${100 - pct(plannedBlocks)}% of your hours were reactive. Plan more; react less.`,
            },
            {
              principle: "Concentrate on few major areas",
              check: meetingPct <= 25,
              pass: `Meeting time is ${meetingPct}% — reasonable. You have time for real work.`,
              fail: `${meetingPct}% in meetings. Consider which meetings to cut, delegate, or shorten.`,
            },
            {
              principle: "Build on strengths (delegate the rest)",
              check: pct(delegateBlocks) <= 15,
              pass: `${pct(delegateBlocks)}% of tasks could be delegated. Good use of your unique skills.`,
              fail: `${pct(delegateBlocks)}% of hours could be delegated. Identify who can take these on.`,
            },
          ].map(({ principle, check, pass, fail }) => (
            <div
              key={principle}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "var(--s2)", border: `1px solid ${check ? "#34D39933" : "#F8717133"}` }}
            >
              <span className="flex-shrink-0 mt-0.5">{check ? "✅" : "⚠️"}</span>
              <div>
                <p style={{ color: "var(--muted)" }} className="text-xs font-bold uppercase tracking-widest">{principle}</p>
                <p className="text-sm mt-1" style={{ color: check ? "#34D399" : "#F87171" }}>
                  {check ? pass : fail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function ScoreCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p style={{ color: "var(--faint)" }} className="text-xs uppercase tracking-widest font-bold mb-2">{label}</p>
      <p className="font-mono text-2xl font-semibold" style={{ color }}>{value}</p>
      <p style={{ color: "var(--faint)" }} className="text-xs mt-1 leading-tight">{sub}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p style={{ color: "var(--text)" }} className="font-serif text-lg mb-0.5">{title}</p>
      {subtitle && <p style={{ color: "var(--faint)" }} className="text-xs mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}
