"use client";
import { useState, useEffect } from "react";
import { TimeBlock, Category, EnergyLevel, DelegateOpt, PriorityTag, CustomCategory } from "@/lib/types";
import { X, Zap, Battery, BatteryLow, HelpCircle } from "lucide-react";

interface Props {
  hour:        number;
  block:       TimeBlock | null;
  targets:     string[];
  categories:  CustomCategory[];
  onSave:      (block: TimeBlock) => void;
  onClose:     () => void;
  prefillTarget?: string | null;
}

const toTime = (h: number) => {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00 ${p}`;
};

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "high",   label: "High",   icon: <Zap size={14} />,       color: "#4ADE80" },
  { value: "medium", label: "Medium", icon: <Battery size={14} />,   color: "#FCD34D" },
  { value: "low",    label: "Low",    icon: <BatteryLow size={14} />, color: "#F87171" },
];

export default function BlockModal({ hour, block, targets, categories: categoriesList, onSave, onClose, prefillTarget }: Props) {
  const [activity,     setActivity]     = useState(block?.activity ?? (prefillTarget ? `Work on ${prefillTarget}` : ""));
  const [categories, setCategories] = useState<string[]>(
    block?.categories ?? (block?.category ? [block.category] : ["working"])
  );
  const [energy,       setEnergy]       = useState<EnergyLevel>(block?.energy   ?? "medium");
  const [wasPlanned,   setWasPlanned]   = useState(block?.wasPlanned   ?? true);
  const [contributedTargets, setContributedTargets] = useState<{name: string, percentage: number}[]>(
    block?.contributedTargets ?? (
      prefillTarget
        ? [{ name: prefillTarget, percentage: 100 }]
        : (block?.contributedPriority && block.contributedPriority !== "None" ? [{ name: block.contributedPriority, percentage: 100 }] : [])
    )
  );
  const [couldDel,     setCouldDel]     = useState<DelegateOpt>(block?.couldDelegate   ?? "na");
  const [satisfaction, setSatisfaction] = useState(block?.satisfaction ?? 3);
  const [contribution, setContribution] = useState(block?.contribution ?? "");
  const [notes,        setNotes]        = useState(block?.notes        ?? "");

  // close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSave = () => {
    if (!activity.trim()) return;
    onSave({
      id:                      block?.id ?? `${hour}-${Date.now()}`,
      startHour:               hour,
      activity:                activity.trim(),
      categories,
      energy,
      wasPlanned,
      contributedToTopPriority: contributedTargets.length > 0,
      contributedPriority: contributedTargets.length > 0 ? contributedTargets[0].name : "None",
      contributedTargets,
      couldDelegate:           couldDel,
      satisfaction,
      contribution:            contribution.trim(),
      notes:                   notes.trim(),
      syncedAt:                null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-2xl md:rounded-xl fade-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-5 pb-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <span style={{ color: "var(--gold)" }} className="font-mono text-sm">
              {toTime(hour)} – {toTime(hour + 1)}
            </span>
            <h3 style={{ color: "var(--text)" }} className="font-serif text-xl mt-0.5">
              {block ? "Edit Hour" : "Log This Hour"}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: "var(--faint)" }} className="hover:text-[var(--text)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Activity */}
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              What did you do? *
            </label>
            <textarea
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Describe what you actually did this hour…"
              rows={2}
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categoriesList.map((c) => {
                const isSelected = categories.includes(c.value);
                return (
                  <button
                    key={c.value}
                    onClick={() => {
                      if (isSelected && categories.length > 1) {
                        setCategories(categories.filter(val => val !== c.value));
                      } else if (!isSelected) {
                        setCategories([...categories, c.value]);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: isSelected ? c.bg : "var(--s2)",
                      border: `1px solid ${isSelected ? c.color : "var(--border)"}`,
                      color: isSelected ? c.color : "var(--muted)",
                    }}
                  >
                  <span className="text-base">{c.emoji}</span>
                  <span className="font-semibold text-xs truncate">{c.label}</span>
                </button>
              )})}
            </div>
          </div>

          {/* Row: Energy + Planned */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-3">
                Energy Level
              </label>
              <div className="flex gap-2">
                {ENERGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEnergy(opt.value)}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all text-xs font-bold"
                    style={{
                      background: energy === opt.value ? `${opt.color}22` : "var(--s2)",
                      border: `1px solid ${energy === opt.value ? opt.color : "var(--border)"}`,
                      color: energy === opt.value ? opt.color : "var(--faint)",
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-3">
                Was this planned?
              </label>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setWasPlanned(v)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: wasPlanned === v ? (v ? "#063e2b" : "#4a0d0d") : "var(--s2)",
                      border: `1px solid ${wasPlanned === v ? (v ? "#34D399" : "#F87171") : "var(--border)"}`,
                      color: wasPlanned === v ? (v ? "#34D399" : "#F87171") : "var(--faint)",
                    }}
                  >
                    {v ? "Planned" : "Reactive"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drucker Questions */}
          <div
            className="rounded-lg p-4 space-y-4"
            style={{ background: "var(--s2)", border: "1px solid var(--border)" }}
          >
            <p style={{ color: "var(--gold)" }} className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <HelpCircle size={12} /> Drucker Effectiveness Check
            </p>

            {/* Top Priority */}
            <div>
              <p style={{ color: "var(--muted)" }} className="text-xs mb-2">
                Did this contribute to: <span style={{ color: "var(--text)" }} className="italic">any of your Targets</span>?
              </p>
              <div className="flex flex-col gap-3 mt-3">
                {targets.length === 0 && <span className="text-xs text-[var(--faint)]">No targets added for this month yet.</span>}
                {targets.map((v) => {
                  const targetObj = contributedTargets.find(t => t.name === v);
                  const isSelected = !!targetObj;
                  return (
                    <div key={v} className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setContributedTargets(contributedTargets.filter(t => t.name !== v));
                          } else {
                            setContributedTargets([...contributedTargets, { name: v, percentage: 50 }]);
                          }
                        }}
                        className="px-4 py-2 rounded text-xs font-bold transition-all text-left flex items-center gap-2"
                        style={{
                          background: isSelected ? "#063e2b" : "var(--s2)",
                          border: `1px solid ${isSelected ? "#34D399" : "var(--border)"}`,
                          color: isSelected ? "#34D399" : "var(--faint)",
                        }}
                      >
                        <span className="w-8 flex-shrink-0">✓</span>
                        <span className="truncate font-normal" style={{ color: isSelected ? "inherit" : "var(--text)" }}>
                          {v}
                        </span>
                      </button>
                      
                      {isSelected && (
                        <div className="pl-12 flex items-center gap-4 fade-up">
                          <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            step="5" 
                            value={targetObj.percentage}
                            onChange={(e) => {
                              const newPct = parseInt(e.target.value, 10);
                              setContributedTargets(contributedTargets.map(t => t.name === v ? { ...t, percentage: newPct } : t));
                            }}
                            className="flex-1 accent-emerald-500 h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold w-12 text-right" style={{ color: "var(--primary)" }}>
                            {targetObj.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delegate */}
            <div>
              <p style={{ color: "var(--muted)" }} className="text-xs mb-2">
                Could someone else have done this? <span style={{ color: "var(--faint)" }}>(delegation check)</span>
              </p>
              <div className="flex gap-2">
                {(["yes", "no", "na"] as DelegateOpt[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCouldDel(v)}
                    className="px-4 py-2 rounded text-xs font-bold transition-all"
                    style={{
                      background: couldDel === v ? "var(--border)" : "var(--s2)",
                      border: `1px solid ${couldDel === v ? "var(--gold)" : "var(--border)"}`,
                      color: couldDel === v ? "var(--gold)" : "var(--faint)",
                    }}
                  >
                    {v === "na" ? "N/A" : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Satisfaction */}
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-3">
              Satisfaction with this hour
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className="star text-2xl"
                  onClick={() => setSatisfaction(n)}
                  style={{ opacity: n <= satisfaction ? 1 : 0.2 }}
                >
                  ⭐
                </button>
              ))}
              <span style={{ color: "var(--muted)" }} className="ml-2 text-sm self-center">
                {["", "Poor", "Below avg", "Okay", "Good", "Excellent"][satisfaction]}
              </span>
            </div>
          </div>

          {/* Contribution */}
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              What contribution did you make?
            </label>
            <p className="drucker-highlight text-xs mb-2">
              "The effective executive focuses on contribution. What results am I responsible for?" — Drucker
            </p>
            <textarea
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="What did you create, enable, or move forward for others?"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              Notes <span style={{ color: "var(--faint)" }} className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context, blockers, or reflections…"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex gap-3 p-5 pt-4"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-gold flex-[2]"
            onClick={handleSave}
            disabled={!activity.trim()}
            style={{ opacity: activity.trim() ? 1 : 0.4 }}
          >
            Log This Hour ✓
          </button>
        </div>
      </div>
    </div>
  );
}
