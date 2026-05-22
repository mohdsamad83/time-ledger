"use client";
import { useState } from "react";
import { DaySetup } from "@/lib/types";
import { Sun, Target, CheckSquare, Sparkles } from "lucide-react";

interface Props {
  date: string;
  onComplete: (setup: DaySetup) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const toLabel = (h: number) => {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00 ${p}`;
};

export default function MorningSetup({ date, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [wakeHour,  setWakeHour]  = useState(6);
  const [sleepHour, setSleepHour] = useState(22);
  const [topPriority,       setTopPriority]       = useState("");
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [task3, setTask3] = useState("");
  const [successDefinition, setSuccessDefinition] = useState("");
  const [druckerFocus,      setDruckerFocus]      = useState("");

  const steps = [
    {
      icon: <Sun size={20} className="text-amber-400" />,
      title: "Set Your Day Boundaries",
      subtitle: "Drucker: \"Know where your time goes — it starts with intent.\"",
      content: (
        <div className="space-y-5">
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              I wake up at
            </label>
            <select
              value={wakeHour}
              onChange={(e) => setWakeHour(Number(e.target.value))}
            >
              {HOURS.slice(3, 14).map((h) => (
                <option key={h} value={h}>{toLabel(h)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              I plan to sleep by
            </label>
            <select
              value={sleepHour}
              onChange={(e) => setSleepHour(Number(e.target.value))}
            >
              {HOURS.slice(18, 25).concat([0, 1, 2]).map((h) => (
                <option key={h} value={h}>{toLabel(h)}</option>
              ))}
            </select>
          </div>
          <p style={{ color: "var(--faint)" }} className="text-sm font-mono">
            {sleepHour > wakeHour
              ? `${sleepHour - wakeHour} hours in your ledger today`
              : `${24 - wakeHour + sleepHour} hours in your ledger today`}
          </p>
        </div>
      ),
      canNext: true,
    },
    {
      icon: <Target size={20} style={{ color: "var(--gold)" }} />,
      title: "The ONE Thing",
      subtitle: "Drucker: \"What needs to be done?\" — not what you want, what NEEDS to be done.",
      content: (
        <div className="space-y-4">
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              If I accomplish only one thing today, it must be…
            </label>
            <textarea
              value={topPriority}
              onChange={(e) => setTopPriority(e.target.value)}
              placeholder="Be specific. No vague intentions."
              rows={3}
            />
          </div>
          <div>
            <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
              Drucker question: What NEEDS to be done?
            </label>
            <textarea
              value={druckerFocus}
              onChange={(e) => setDruckerFocus(e.target.value)}
              placeholder="Not 'what do I want' — what genuinely needs doing for the organisation / people / mission?"
              rows={3}
            />
          </div>
        </div>
      ),
      canNext: topPriority.trim().length > 0,
    },
    {
      icon: <CheckSquare size={20} className="text-emerald-400" />,
      title: "Today's Commitments",
      subtitle: "Drucker: \"Effective executives concentrate on a few major areas — never more than three.\"",
      content: (
        <div className="space-y-4">
          {[
            { val: task1, set: setTask1, label: "Commitment #1", placeholder: "Must be done today" },
            { val: task2, set: setTask2, label: "Commitment #2", placeholder: "Should be done today" },
            { val: task3, set: setTask3, label: "Commitment #3", placeholder: "Would be great to do" },
          ].map((t, i) => (
            <div key={i}>
              <label style={{ color: "var(--muted)" }} className="block text-xs font-bold uppercase tracking-widest mb-2">
                {t.label}
              </label>
              <input
                type="text"
                value={t.val}
                onChange={(e) => t.set(e.target.value)}
                placeholder={t.placeholder}
              />
            </div>
          ))}
        </div>
      ),
      canNext: task1.trim().length > 0,
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
      onComplete({
        wakeHour,
        sleepHour,
        topPriority,
        tasks: [task1, task2, task3],
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
                background: i <= step ? "var(--gold)" : "var(--border)",
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
              className="btn-gold"
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
