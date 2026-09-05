"use client";
import { useState } from "react";
import { DaySetup, RoutineItem } from "@/lib/types";
import { Sun, Target, CheckSquare, Sparkles } from "lucide-react";

interface Props {
  date: string;
  targets: string[];
  routine: RoutineItem[];
  onComplete: (setup: DaySetup) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const toLabel = (h: number) => {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00 ${p}`;
};

export default function MorningSetup({ date, targets, routine, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [successDefinition, setSuccessDefinition] = useState("");
  const [druckerFocus,      setDruckerFocus]      = useState("");

  const steps = [
    {
      icon: <Target size={20} className="primary-text" />,
      title: "Daily Targets & Focus",
      subtitle: "Review your core targets and define what needs to be done today.",
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border" style={{ background: "var(--s2)", borderColor: "var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Your Daily Targets</p>
            <div className="flex flex-wrap gap-2">
              {targets.map(t => (
                <span key={t} className="cat-badge bg-[var(--surface)] border border-[var(--border)]">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 mt-4" style={{ color: "var(--muted)" }}>
              Drucker question: What NEEDS to be done?
            </label>
            <textarea
              value={druckerFocus}
              onChange={(e) => setDruckerFocus(e.target.value)}
              placeholder="Not 'what do I want' — what genuinely needs doing for the organisation / mission?"
              rows={3}
            />
          </div>
        </div>
      ),
      canNext: druckerFocus.trim().length > 0,
    },
    {
      icon: <Sparkles size={20} className="text-violet-400" />,
      title: "Define a Winning Day",
      subtitle: "Drucker: \"Effectiveness is doing the right things.\" What does right look like today?",
      content: (
        <div>
          <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
            At 11 PM, I'll know today was a great day if…
          </label>
          <textarea
            value={successDefinition}
            onChange={(e) => setSuccessDefinition(e.target.value)}
            placeholder="Describe the feeling, the outcomes, the person you showed up as."
            rows={4}
          />
        </div>
      ),
      canNext: successDefinition.trim().length > 0,
    },
  ];

  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      let finalWake = 6;
      let finalSleep = 22;

      if (routine && routine.length > 0) {
        let minH = 24, maxH = 0;
        for (const item of routine) {
          if (!item.startTime || !item.endTime) continue;
          const sH = parseInt(item.startTime.split(":")[0], 10);
          const eH = parseInt(item.endTime.split(":")[0], 10);
          if (!isNaN(sH)) minH = Math.min(minH, sH);
          if (!isNaN(eH)) maxH = Math.max(maxH, eH);
        }
        if (minH < 24) finalWake = minH;
        if (maxH > 0) finalSleep = maxH;
      }

      onComplete({
        wakeHour: finalWake,
        sleepHour: finalSleep,
        topPriority: "",
        tasks: ["", "", ""],
        tasksCompleted: [false, false, false],
        successDefinition,
        druckerFocus,
      });
    } else {
      setStep((s) => s + 1);
    }
  };

  const s = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg fade-up">
        {/* Progress dots */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 28 : 8,
                background: i <= step ? "var(--primary)" : "var(--border)",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-2">
            {s.icon}
            <h2 style={{ color: "var(--text)" }} className="font-serif text-2xl">{s.title}</h2>
          </div>
          <p className="drucker-highlight mb-6 text-sm">{s.subtitle}</p>

          {s.content}

          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
                ← Back
              </button>
            ) : (
              <div />
            )}
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={!s.canNext}
              style={{ opacity: s.canNext ? 1 : 0.4 }}
            >
              {isLast ? "Open the Ledger →" : "Continue →"}
            </button>
          </div>
        </div>

        {/* Step label */}
        <p style={{ color: "var(--faint)" }} className="text-center text-xs font-mono mt-4">
          Step {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
