"use client";
import { useState } from "react";
import { X, CalendarClock } from "lucide-react";

interface Props {
  onClose: () => void;
  onSave: (commitments: [string, string, string]) => void;
  targets: string[];
}

export default function PlanTomorrowModal({ onClose, onSave, targets }: Props) {
  const [tasks, setTasks] = useState<[string, string, string]>(["", "", ""]);

  const updateTask = (index: number, val: string) => {
    const newTasks = [...tasks] as [string, string, string];
    newTasks[index] = val;
    setTasks(newTasks);
  };

  const handleSave = () => {
    onSave(tasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
      <div 
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <CalendarClock size={24} className="primary-text" />
            <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>Plan Tomorrow</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-black/10 transition-colors">
            <X size={20} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        <p className="mb-6 text-sm" style={{ color: "var(--faint)" }}>
          Set your top 3 commitments for tomorrow. Once tomorrow arrives, you will only have <strong>one chance</strong> to edit these before they are permanently locked.
        </p>

        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>
                Commitment {i + 1}
              </label>
              <select
                value={tasks[i]}
                onChange={(e) => updateTask(i, e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border focus:outline-none transition-colors"
                style={{ 
                  background: "var(--bg)", 
                  borderColor: "var(--border)",
                  color: "var(--text)" 
                }}
              >
                <option value="">-- Select a Target --</option>
                {targets.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Lock in for Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
