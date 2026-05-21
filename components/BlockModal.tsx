"use client";
import { useState, useEffect } from "react";
import { TimeBlock, CATEGORIES, Category, EnergyLevel, DelegateOpt } from "@/lib/types";
import { X, Zap, Battery, BatteryLow, HelpCircle } from "lucide-react";
import clsx from "clsx";

interface Props {
  hour:        number;
  block:       TimeBlock | null;
  topPriority: string;
  onSave:      (block: TimeBlock) => void;
  onClose:     () => void;
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

export default function BlockModal({ hour, block, topPriority, onSave, onClose }: Props) {
  const [activity,     setActivity]     = useState(block?.activity     ?? "");
  const [category,     setCategory]     = useState<Category>(block?.category     ?? "deep-work");
  const [energy,       setEnergy]       = useState<EnergyLevel>(block?.energy   ?? "medium");
  const [wasPlanned,   setWasPlanned]   = useState(block?.wasPlanned   ?? true);
  const [topPri,       setTopPri]       = useState(block?.contributedToTopPriority ?? false);
  const [couldDel,     setCouldDel]     = useState<DelegateOpt>(block?.couldDelegate ?? "no");
  const [satisfaction, setSatisfaction] = useState(block?.satisfaction ?? 3);
  const [contribution, setContribution] = useState(block?.contribution ?? "");
  const [notes,        setNotes]        = useState(block?.notes        ?? "");

  // close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const selCat = CATEGORIES.find((c) => c.value === category)!;

  const handleSave = () => {
    if (!activity.trim()) return;
    onSave({
      id:                      block?.id ?? `${hour}-${Date.now()}`,
      startHour:               hour,
      activity:                activity.trim(),
      category,
      energy,
      wasPlanned,
      contributedToTopPriority: topPri,
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
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-2xl md:rounded-xl fade-up"
        style={{ background: "#17150F", border: "1px solid #2A261A" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-5 pb-4"
          style={{ background: "#17150F", borderBottom: "1px solid #2A261A" }}
        >
          <div>
            <span className="font-mono text-[#C9A84C] text-sm">
              {toTime(hour)} – {toTime(hour + 1)}
            </span>
            <h3 className="font-serif text-xl text-[#EDE8DC] mt-0.5">
              {block ? "Edit Hour" : "Log This Hour"}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#5C5247] hover:text-[#EDE8DC] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Activity */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
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
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: category === cat.value ? cat.bg : "#1E1B13",
                    border: `1px solid ${category === cat.value ? cat.color : "#2A261A"}`,
                    color: category === cat.value ? cat.color : "#A09580",
                  }}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row: Energy + Planned */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-3">
                Energy Level
              </label>
              <div className="flex gap-2">
                {ENERGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEnergy(opt.value)}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all text-xs font-bold"
                    style={{
                      background: energy === opt.value ? `${opt.color}22` : "#1E1B13",
                      border: `1px solid ${energy === opt.value ? opt.color : "#2A261A"}`,
                      color: energy === opt.value ? opt.color : "#5C5247",
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-3">
                Was this planned?
              </label>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setWasPlanned(v)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: wasPlanned === v ? (v ? "#063e2b" : "#4a0d0d") : "#1E1B13",
                      border: `1px solid ${wasPlanned === v ? (v ? "#34D399" : "#F87171") : "#2A261A"}`,
                      color: wasPlanned === v ? (v ? "#34D399" : "#F87171") : "#5C5247",
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
            style={{ background: "#1E1B13", border: "1px solid #2A261A" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] flex items-center gap-2">
              <HelpCircle size={12} /> Drucker Effectiveness Check
            </p>

            {/* Top Priority */}
            <div>
              <p className="text-xs text-[#A09580] mb-2">
                Did this contribute to: <span className="text-[#EDE8DC] italic">"{topPriority || "your top priority"}"</span>?
              </p>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setTopPri(v)}
                    className="px-4 py-2 rounded text-xs font-bold transition-all"
                    style={{
                      background: topPri === v ? (v ? "#063e2b" : "#1E1B13") : "#1E1B13",
                      border: `1px solid ${topPri === v ? (v ? "#34D399" : "#2A261A") : "#2A261A"}`,
                      color: topPri === v ? (v ? "#34D399" : "#5C5247") : "#5C5247",
                    }}
                  >
                    {v ? "✓ Yes" : "✗ No"}
                  </button>
                ))}
              </div>
            </div>

            {/* Delegate */}
            <div>
              <p className="text-xs text-[#A09580] mb-2">
                Could someone else have done this? <span className="text-[#5C5247]">(delegation check)</span>
              </p>
              <div className="flex gap-2">
                {(["yes", "no", "na"] as DelegateOpt[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCouldDel(v)}
                    className="px-4 py-2 rounded text-xs font-bold transition-all"
                    style={{
                      background: couldDel === v ? "#2A261A" : "#1E1B13",
                      border: `1px solid ${couldDel === v ? "#C9A84C" : "#2A261A"}`,
                      color: couldDel === v ? "#C9A84C" : "#5C5247",
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
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-3">
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
              <span className="ml-2 text-sm text-[#A09580] self-center">
                {["", "Poor", "Below avg", "Okay", "Good", "Excellent"][satisfaction]}
              </span>
            </div>
          </div>

          {/* Contribution */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
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
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
              Notes <span className="text-[#5C5247] normal-case font-normal">(optional)</span>
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
          style={{ background: "#17150F", borderTop: "1px solid #2A261A" }}
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
