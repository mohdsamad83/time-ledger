"use client";
import { useState, useEffect } from "react";
import { DaySetup, RoutineItem } from "@/lib/types";
import { Sun } from "lucide-react";

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
  const [wakeHour, setWakeHour] = useState(6);
  const [sleepHour, setSleepHour] = useState(22);

  useEffect(() => {
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
    setWakeHour(finalWake);
    setSleepHour(finalSleep);
  }, [routine]);

  const handleNext = () => {
    onComplete({
      wakeHour,
      sleepHour,
      topPriority: "",
      tasks: ["", "", ""],
      tasksCompleted: [false, false, false],
      successDefinition: "",
      druckerFocus: "",
    });
  };

  const dayLength = sleepHour < wakeHour 
    ? (24 - wakeHour) + sleepHour 
    : sleepHour - wakeHour;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg fade-up">
        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sun size={20} className="text-yellow-400" />
            <h2 style={{ color: "var(--text)" }} className="font-serif text-2xl">Set Your Day Boundaries</h2>
          </div>
          <p className="drucker-highlight mb-6 text-sm">
            Drucker: "Know where your time goes — it starts with intent."
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                I WAKE UP AT
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                value={wakeHour}
                onChange={(e) => setWakeHour(Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {toLabel(h)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                I PLAN TO SLEEP BY
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                value={sleepHour}
                onChange={(e) => setSleepHour(Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {toLabel(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-8 mb-4">
             <p className="text-sm font-mono font-bold" style={{ color: "var(--faint)" }}>
               {dayLength} hours in your ledger today
             </p>
          </div>

          <div className="flex items-center justify-end mt-4">
            <button
              className="btn-primary"
              onClick={handleNext}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
