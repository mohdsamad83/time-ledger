"use client";
import { useState } from "react";
import { RoutineItem } from "@/lib/types";
import { Clock, Plus, Save, Trash2 } from "lucide-react";

interface Props {
  routine: RoutineItem[];
  onSave: (routine: RoutineItem[]) => Promise<void>;
}

function calculateDuration(start: string, end: string): string {
  if (!start || !end) return "0 hr";
  
  const [startHr, startMin] = start.split(":").map(Number);
  const [endHr, endMin] = end.split(":").map(Number);
  
  if (isNaN(startHr) || isNaN(endHr)) return "0 hr";

  let startTotal = startHr * 60 + (startMin || 0);
  let endTotal = endHr * 60 + (endMin || 0);
  
  // Handle overnight shift (e.g. 22:00 to 05:30)
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  
  const diffMins = endTotal - startTotal;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (mins === 0) return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
  if (mins === 30) return `${hrs} ½ hr`;
  return `${hrs}h ${mins}m`;
}

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hrStr, minStr] = time24.split(":");
  let hr = parseInt(hrStr, 10);
  if (isNaN(hr)) return time24;
  const period = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${hr}:${minStr} ${period}`;
}

export default function RoutineView({ routine: initialRoutine, onSave }: Props) {
  const [routine, setRoutine] = useState<RoutineItem[]>(initialRoutine || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = () => {
    setRoutine([...routine, { activity: "", startTime: "", endTime: "" }]);
  };

  const handleRemove = (index: number) => {
    setRoutine(routine.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof RoutineItem, value: string) => {
    const updated = [...routine];
    updated[index] = { ...updated[index], [field]: value };
    setRoutine(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(routine);
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 fade-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 style={{ color: "var(--text)" }} className="font-serif text-3xl mb-1">Time Table</h2>
          <p style={{ color: "var(--faint)" }} className="text-sm">Design your ideal daily routine.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Routine"}
          <Save size={16} />
        </button>
      </div>

      <div className="bg-white/5 rounded-2xl p-6" style={{ border: "1px solid var(--border)" }}>
        
        {routine.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto mb-4 opacity-20 text-[var(--text)]" />
            <p className="text-[var(--text)] font-medium mb-2">No routine defined</p>
            <p className="text-[var(--faint)] text-sm mb-6">Create your ideal time table to structure your days.</p>
            <button onClick={handleAdd} className="btn-ghost px-4 py-2 rounded-lg text-sm">
              + Add First Activity
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden md:flex gap-4 px-2 pb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>
              <div className="flex-[3]">Activity</div>
              <div className="flex-[2]">Start Time</div>
              <div className="flex-[2]">End Time</div>
              <div className="flex-[1] text-center">Duration</div>
              <div className="w-8"></div>
            </div>

            {routine.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-4 items-center p-3 rounded-xl transition-colors hover:bg-white/5" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
                
                <div className="w-full md:flex-[3]">
                  <input
                    type="text"
                    value={item.activity}
                    onChange={(e) => handleChange(idx, "activity", e.target.value)}
                    placeholder="e.g., WAKE UP, Gym, LEARN"
                    className="w-full bg-transparent outline-none font-bold placeholder:font-normal"
                    style={{ color: "var(--text)" }}
                  />
                </div>

                <div className="w-full md:flex-[2] flex items-center gap-2">
                  <span className="md:hidden text-xs text-[var(--faint)] w-12">From:</span>
                  <input
                    type="time"
                    value={item.startTime}
                    onChange={(e) => handleChange(idx, "startTime", e.target.value)}
                    className="bg-black/20 px-3 py-1.5 rounded-lg border outline-none w-full font-mono text-sm"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>

                <div className="w-full md:flex-[2] flex items-center gap-2">
                  <span className="md:hidden text-xs text-[var(--faint)] w-12">To:</span>
                  <input
                    type="time"
                    value={item.endTime}
                    onChange={(e) => handleChange(idx, "endTime", e.target.value)}
                    className="bg-black/20 px-3 py-1.5 rounded-lg border outline-none w-full font-mono text-sm"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>

                <div className="w-full md:flex-[1] flex items-center justify-between md:justify-center">
                  <span className="md:hidden text-xs text-[var(--faint)]">Duration:</span>
                  <span className="font-mono text-sm font-bold" style={{ color: "var(--primary)" }}>
                    {calculateDuration(item.startTime, item.endTime)}
                  </span>
                </div>

                <button 
                  onClick={() => handleRemove(idx)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button 
              onClick={handleAdd}
              className="w-full mt-4 py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--faint)" }}
            >
              <Plus size={16} /> Add Activity
            </button>
          </div>
        )}
      </div>

      {routine.length > 0 && (
        <div className="mt-8 p-6 rounded-2xl text-center" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Your Daily Blueprint</p>
          <p className="text-xs" style={{ color: "var(--faint)" }}>
            Review this schedule every evening when doing your setup.
          </p>
        </div>
      )}
    </div>
  );
}
