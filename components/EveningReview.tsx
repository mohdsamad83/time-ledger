"use client";
import { useState, useEffect } from "react";
import { EveningReview, TimeBlock, DaySetup } from "@/lib/types";
import { X, Moon } from "lucide-react";

interface Props {
  date:          string;
  setup:         DaySetup;
  blocks:        { [hour: number]: TimeBlock };
  review:        EveningReview | null;
  onSave:        (r: EveningReview) => void;
  onClose:       () => void;
}

export default function EveningReviewModal({ setup, blocks, review, onSave, onClose }: Props) {
  const [topAccomplished, setTopAccomplished]   = useState(review?.topPriorityAccomplished ?? false);
  const [accomplishments, setAccomplishments]   = useState(review?.accomplishments ?? "");
  const [biggestWaste,    setBiggestWaste]       = useState(review?.biggestWaste ?? "");
  const [stopDoing,       setStopDoing]          = useState(review?.stopDoing ?? "");
  const [keepDoing,       setKeepDoing]          = useState(review?.keepDoing ?? "");
  const [tomorrowPri,     setTomorrowPri]        = useState(review?.tomorrowPriority ?? "");
  const [rating,          setRating]             = useState(review?.overallRating ?? 7);
  const [energyEnd,       setEnergyEnd]          = useState<EveningReview["energyEnd"]>(review?.energyEnd ?? "neutral");
  const [contribution,    setContribution]       = useState(review?.druckerContribution ?? "");

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Auto-calc stats
  const loggedBlocks = Object.values(blocks);
  const plannedPct = loggedBlocks.length > 0
    ? Math.round((loggedBlocks.filter((b) => b.wasPlanned).length / loggedBlocks.length) * 100) : 0;
  const priorityPct = loggedBlocks.length > 0
    ? Math.round((loggedBlocks.filter((b) => b.contributedToTopPriority).length / loggedBlocks.length) * 100) : 0;

  const handleSave = () => {
    onSave({
      topPriorityAccomplished: topAccomplished,
      accomplishments: accomplishments.trim(),
      biggestWaste:    biggestWaste.trim(),
      stopDoing:       stopDoing.trim(),
      keepDoing:       keepDoing.trim(),
      tomorrowPriority: tomorrowPri.trim(),
      overallRating:   rating,
      energyEnd,
      druckerContribution: contribution.trim(),
      syncedAt: null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
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
          <div className="flex items-center gap-3">
            <Moon size={18} className="text-violet-400" />
            <div>
              <h3 className="font-serif text-xl text-[#EDE8DC]">Evening Review</h3>
              <p className="text-xs text-[#5C5247]">Your daily ledger closing entry</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#5C5247] hover:text-[#EDE8DC] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">

          {/* Auto-stats */}
          <div
            className="rounded-lg p-4 grid grid-cols-3 gap-4"
            style={{ background: "#1E1B13", border: "1px solid #2A261A" }}
          >
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold text-[#C9A84C]">{loggedBlocks.length}</p>
              <p className="text-[#5C5247] text-xs mt-1">Hours logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold text-[#4ADE80]">{plannedPct}%</p>
              <p className="text-[#5C5247] text-xs mt-1">Planned time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold text-[#60A5FA]">{priorityPct}%</p>
              <p className="text-[#5C5247] text-xs mt-1">On top priority</p>
            </div>
          </div>

          {/* Top priority accomplished? */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
              Did you accomplish your #1 priority?
            </p>
            <p className="text-sm text-[#EDE8DC] italic mb-3">"{setup.topPriority}"</p>
            <div className="flex gap-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setTopAccomplished(v)}
                  className="flex-1 py-3 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: topAccomplished === v ? (v ? "#063e2b" : "#4a0d0d") : "#1E1B13",
                    border: `1px solid ${topAccomplished === v ? (v ? "#34D399" : "#F87171") : "#2A261A"}`,
                    color: topAccomplished === v ? (v ? "#34D399" : "#F87171") : "#5C5247",
                  }}
                >
                  {v ? "✓ Yes, done." : "✗ Not fully."}
                </button>
              ))}
            </div>
          </div>

          {/* Accomplishments */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
              What did you actually get done?
            </label>
            <p className="drucker-highlight text-xs mb-2">
              Drucker: "What did I actually accomplish vs. what I intended to do?"
            </p>
            <textarea value={accomplishments} onChange={(e) => setAccomplishments(e.target.value)}
              placeholder="List your real wins, outputs, outcomes…" rows={3} />
          </div>

          {/* Biggest waste */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
              Biggest time waste today
            </label>
            <p className="drucker-highlight text-xs mb-2">
              Drucker: "Where did my time go that I cannot account for?"
            </p>
            <textarea value={biggestWaste} onChange={(e) => setBiggestWaste(e.target.value)}
              placeholder="Be honest — what stole your time?" rows={2} />
          </div>

          {/* Stop / Keep */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#F87171] mb-2">
                🛑 I will STOP doing
              </label>
              <textarea value={stopDoing} onChange={(e) => setStopDoing(e.target.value)}
                placeholder="What drains without creating value?" rows={2} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#34D399] mb-2">
                ✓ I will KEEP doing
              </label>
              <textarea value={keepDoing} onChange={(e) => setKeepDoing(e.target.value)}
                placeholder="What worked brilliantly today?" rows={2} />
            </div>
          </div>

          {/* Drucker contribution */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
              The Drucker Contribution Question
            </label>
            <p className="drucker-highlight text-xs mb-2">
              "What is my contribution? What results am I responsible for delivering to make a real difference?"
            </p>
            <textarea value={contribution} onChange={(e) => setContribution(e.target.value)}
              placeholder="What genuine contribution did you make today — to your team, organisation, or the world?" rows={3} />
          </div>

          {/* Tomorrow priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-2">
              Tomorrow's #1 Priority
            </label>
            <input type="text" value={tomorrowPri} onChange={(e) => setTomorrowPri(e.target.value)}
              placeholder="What NEEDS to be done tomorrow?" />
          </div>

          {/* Day rating + energy */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-3">
                Day Rating
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={10} value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="flex-1 accent-yellow-500"
                  style={{ background: "transparent", border: "none", padding: 0 }}
                />
                <span className="font-mono text-xl font-bold text-[#C9A84C] w-6">{rating}</span>
              </div>
              <div className="flex justify-between text-[#5C5247] text-xs mt-1">
                <span>Terrible</span><span>Perfect</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#A09580] mb-3">
                Energy at Day's End
              </label>
              <div className="flex flex-col gap-2">
                {(["energized", "neutral", "drained"] as const).map((v) => (
                  <button key={v} onClick={() => setEnergyEnd(v)}
                    className="py-2 rounded text-xs font-bold transition-all text-left px-3"
                    style={{
                      background: energyEnd === v
                        ? v === "energized" ? "#063e2b" : v === "neutral" ? "#2A261A" : "#4a0d0d"
                        : "#1E1B13",
                      border: `1px solid ${energyEnd === v
                        ? v === "energized" ? "#34D399" : v === "neutral" ? "#7A6228" : "#F87171"
                        : "#2A261A"}`,
                      color: energyEnd === v
                        ? v === "energized" ? "#34D399" : v === "neutral" ? "#C9A84C" : "#F87171"
                        : "#5C5247",
                    }}>
                    {v === "energized" ? "⚡ Energized" : v === "neutral" ? "😐 Neutral" : "😮‍💨 Drained"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex gap-3 p-5 pt-4"
          style={{ background: "#17150F", borderTop: "1px solid #2A261A" }}
        >
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-gold flex-[2]" onClick={handleSave}>
            Close Today's Ledger ✓
          </button>
        </div>
      </div>
    </div>
  );
}
