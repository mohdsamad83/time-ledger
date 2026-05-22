"use client";

import { useState } from "react";
import { X, Zap, LayoutTemplate, CheckCircle2, Clock } from "lucide-react";
import { TEMPLATES, ScheduleTemplate } from "@/lib/templates";
import { CATEGORIES } from "@/lib/types";

interface Props {
  onApply: (template: ScheduleTemplate) => void;
  onClose: () => void;
}

export default function TemplateModal({ onApply, onClose }: Props) {
  const [selected, setSelected] = useState<ScheduleTemplate>(TEMPLATES[0]);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    setApplying(true);
    await new Promise((r) => setTimeout(r, 400)); // brief visual pause
    onApply(selected);
    onClose();
  };

  const toTime = (h: number) => {
    const p = h < 12 ? "AM" : "PM";
    return `${h % 12 || 12}:00 ${p}`;
  };

  // Count categories in selected template
  const catCounts: Record<string, number> = {};
  selected.blocks.forEach((b) => {
    catCounts[b.category] = (catCounts[b.category] ?? 0) + 1;
  });
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-2xl max-h-[92vh] overflow-hidden rounded-t-2xl md:rounded-2xl fade-up flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between p-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--s2)", border: "1px solid var(--border)" }}
            >
              <LayoutTemplate size={16} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <h3 style={{ color: "var(--text)" }} className="font-serif text-xl">Schedule Templates</h3>
              <p style={{ color: "var(--faint)" }} className="text-xs">Apply a full day's plan in one click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--faint)" }}
            className="hover:text-[var(--text)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Template selector (if more than 1 template) ── */}
        {TEMPLATES.length > 1 && (
          <div
            className="flex gap-2 p-4 flex-shrink-0 overflow-x-auto"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all"
                style={{
                  background: selected.id === t.id ? "var(--s2)" : "transparent",
                  border: `1px solid ${selected.id === t.id ? "var(--gold)" : "var(--border)"}`,
                  color: selected.id === t.id ? "var(--gold)" : "var(--muted)",
                }}
              >
                <span>{t.emoji}</span>
                <span className="font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Template preview ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Summary card */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--s2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 22 }}>{selected.emoji}</span>
                  <span style={{ color: "var(--text)" }} className="font-serif text-lg font-semibold">
                    {selected.name}
                  </span>
                </div>
                <p style={{ color: "var(--muted)" }} className="text-sm">{selected.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ color: "var(--gold)" }} className="font-mono text-lg font-bold">
                  {selected.blocks.length}h
                </div>
                <div style={{ color: "var(--faint)" }} className="text-xs">planned</div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="flex flex-wrap gap-2">
              {topCats.map(([cat, count]) => {
                const info = CATEGORIES.find((c) => c.value === cat);
                if (!info) return null;
                return (
                  <span
                    key={cat}
                    className="cat-badge"
                    style={{ background: `${info.color}22`, color: info.color }}
                  >
                    {info.emoji} {info.label} · {count}h
                  </span>
                );
              })}
            </div>

            {/* Time range */}
            <div className="flex items-center gap-2 mt-3" style={{ color: "var(--faint)" }}>
              <Clock size={12} />
              <span className="text-xs font-mono">
                {toTime(selected.wakeHour)} → {toTime(selected.sleepHour)}
              </span>
            </div>
          </div>

          {/* ── Notice ── */}
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ background: "var(--s2)", border: "1px solid var(--dim)" }}
          >
            <Zap size={13} style={{ color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
            <p style={{ color: "var(--muted)" }} className="text-xs leading-relaxed">
              Applying this template will pre-fill all planned blocks for today. You can still edit
              each block individually after applying. Existing blocks for the same hours will be overwritten.
            </p>
          </div>

          {/* ── Block list ── */}
          <div>
            <p style={{ color: "var(--faint)" }} className="text-xs font-bold uppercase tracking-widest mb-3">
              Hourly Breakdown
            </p>
            <div className="space-y-1.5">
              {selected.blocks.map((block) => {
                const cat = CATEGORIES.find((c) => c.value === block.category)!;
                return (
                  <div
                    key={block.startHour}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: "var(--s2)", border: "1px solid var(--border)" }}
                  >
                    {/* Time */}
                    <span
                      style={{ color: "var(--faint)", minWidth: 56 }}
                      className="font-mono text-xs text-right flex-shrink-0"
                    >
                      {toTime(block.startHour)}
                    </span>

                    {/* Category dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: cat.color }}
                    />

                    {/* Activity */}
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "var(--text)" }} className="text-sm truncate">
                        {block.activity}
                      </p>
                      {block.notes && (
                        <p style={{ color: "var(--faint)" }} className="text-xs truncate italic mt-0.5">
                          {block.notes}
                        </p>
                      )}
                    </div>

                    {/* Category badge */}
                    <span
                      className="cat-badge flex-shrink-0 hidden sm:inline-flex"
                      style={{ background: `${cat.color}22`, color: cat.color }}
                    >
                      {cat.emoji} {cat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex gap-3 p-5 pt-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-gold flex-[2] flex items-center justify-center gap-2"
            onClick={handleApply}
            disabled={applying}
            style={{ opacity: applying ? 0.7 : 1 }}
          >
            {applying ? (
              <>
                <span className="spin-slow inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                Applying…
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Apply Template to Today
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
