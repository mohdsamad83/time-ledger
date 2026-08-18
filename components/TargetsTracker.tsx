"use client";

import { useState, useEffect } from "react";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from "date-fns";
import { AppData } from "@/lib/types";
import { ChevronLeft, ChevronRight, Target, X } from "lucide-react";

interface Props {
  data: AppData;
  onToggle: (date: string, targetName: string) => void;
  onUpdateTargets?: (targets: string[]) => void;
}

export default function TargetsTracker({ data, onToggle, onUpdateTargets }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isEditing, setIsEditing] = useState(false);
  const [localTargets, setLocalTargets] = useState<string[]>([]);
  const [newTarget, setNewTarget] = useState("");

  const daysInMonth = getDaysInMonth(currentMonth);
  const targets = data.targets || [];
  
  useEffect(() => {
    if (isEditing) {
      setLocalTargets([...targets]);
    }
  }, [isEditing, targets]);

  const monthStr = format(currentMonth, "yyyy-MM");
  
  // Create array of date strings for the month (e.g., "2026-08-01", "2026-08-02")
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${monthStr}-${d.toString().padStart(2, "0")}`;
  });

  // Calculate row stats
  const rowStats = targets.map(target => {
    let completed = 0;
    days.forEach(dateStr => {
      const dayData = data.days[dateStr];
      if (dayData?.targets?.[target]) {
        completed++;
      }
    });
    return { target, completed, percent: Math.round((completed / daysInMonth) * 100) };
  });

  // Calculate column stats
  const colStats = days.map(dateStr => {
    const dayData = data.days[dateStr];
    let completed = 0;
    targets.forEach(t => {
      if (dayData?.targets?.[t]) completed++;
    });
    return {
      completed,
      incomplete: targets.length - completed,
      percent: Math.round((completed / (targets.length || 1)) * 100)
    };
  });

  // Overall stats
  const totalPossible = targets.length * daysInMonth;
  const totalCompleted = rowStats.reduce((acc, r) => acc + r.completed, 0);
  const currentLevel = totalPossible > 0 ? ((totalCompleted / totalPossible) * 100).toFixed(2) : "0.00";
  const lostLevel = totalPossible > 0 ? (100 - parseFloat(currentLevel)).toFixed(2) : "0.00";

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-up">
      {/* Header & Month Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--s2)" }}>
            <Target className="primary-text" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Goal Tracker</h2>
            <p className="text-sm" style={{ color: "var(--faint)" }}>Stay consistent. Hope is everything.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {onUpdateTargets && (
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className="btn-ghost text-xs px-3 py-1.5"
            >
              {isEditing ? "Cancel Edit" : "Edit Targets"}
            </button>
          )}

          <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "var(--muted)" }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-sm w-32 text-center" style={{ color: "var(--text)" }}>
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "var(--muted)" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="p-5 rounded-xl space-y-5 fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>Manage Targets</h3>
          
          <div className="flex flex-wrap gap-2">
             {localTargets.length === 0 && <span className="text-xs text-[var(--faint)]">No targets added yet.</span>}
             {localTargets.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text)" }}>{t}</span>
                  <button 
                    onClick={() => setLocalTargets(localTargets.filter((_, i) => i !== idx))} 
                    className="hover:text-red-400 transition-colors"
                    style={{ color: "var(--faint)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
             ))}
          </div>

          <div className="flex gap-2">
            <input 
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newTarget.trim()) {
                  setLocalTargets([...localTargets, newTarget.trim()]);
                  setNewTarget("");
                }
              }}
              placeholder="New Target Name..."
              className="px-4 py-2 text-sm rounded-lg border bg-transparent flex-1 focus:outline-none"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            />
            <button 
               onClick={() => { 
                 if(newTarget.trim() && !localTargets.includes(newTarget.trim())) { 
                   setLocalTargets([...localTargets, newTarget.trim()]); 
                   setNewTarget(""); 
                 } 
               }}
               className="btn-gold text-sm px-5 py-2"
               disabled={!newTarget.trim()}
            >
               Add
            </button>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <button 
              onClick={() => { 
                onUpdateTargets?.(localTargets); 
                setIsEditing(false); 
              }}
              className="btn-primary w-full py-2.5 mt-2"
            >
              Save Targets to Ledger ✓
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl text-center space-y-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Current Level</p>
          <p className="text-3xl font-bold text-emerald-500">{currentLevel}%</p>
        </div>
        <div className="p-4 rounded-xl text-center space-y-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>What You Have Lost</p>
          <p className="text-3xl font-bold text-red-400">{lostLevel}%</p>
        </div>
        <div className="p-4 rounded-xl text-center space-y-1 flex flex-col justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Reward Target</p>
          <input 
            type="text" 
            placeholder="e.g. Vacation 🌴 4 Days"
            className="text-center font-bold bg-transparent border-none focus:ring-0 w-full mt-1"
            style={{ color: "var(--text)", outline: "none" }}
          />
        </div>
      </div>

      {/* The Grid Tracker */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 border font-medium text-left min-w-[150px]" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                Targets
              </th>
              <th className="p-2 border font-medium w-16" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                %
              </th>
              {days.map((_, i) => (
                <th key={i} className="p-2 border font-medium w-8 text-xs" style={{ borderColor: "var(--border)", color: "var(--faint)" }}>
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targets.length === 0 && (
               <tr>
                 <td colSpan={days.length + 2} className="p-8 text-center text-[var(--faint)]">
                   No targets configured. Click "Edit Targets" to add some!
                 </td>
               </tr>
            )}
            {targets.map((target, rowIdx) => {
              const stat = rowStats[rowIdx];
              return (
                <tr key={target} className="hover:bg-white/5 transition-colors">
                  <td className="p-2 border font-semibold text-left text-xs truncate" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    {target}
                  </td>
                  <td className="p-2 border text-xs font-bold" style={{ borderColor: "var(--border)", color: "var(--primary)" }}>
                    {stat.percent}%
                  </td>
                  {days.map((dateStr, colIdx) => {
                    const isCompleted = data.days[dateStr]?.targets?.[target] || false;
                    return (
                      <td key={colIdx} className="p-0 border relative" style={{ borderColor: "var(--border)" }}>
                        <button
                          onClick={() => onToggle(dateStr, target)}
                          className="w-full h-full min-h-[30px] flex items-center justify-center transition-colors hover:bg-white/10"
                        >
                          <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                            isCompleted 
                              ? "bg-emerald-500 border-emerald-500" 
                              : "border-[var(--faint)] bg-transparent"
                          }`}>
                            {isCompleted && (
                              <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 text-white">
                                <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Progress % */}
            <tr>
              <td colSpan={2} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>Progress %</td>
              {colStats.map((stat, i) => (
                <td key={i} className="p-1 border text-[10px] font-bold" style={{ borderColor: "var(--border)", color: "var(--primary)", background: "var(--s2)" }}>
                  {stat.percent}%
                </td>
              ))}
            </tr>
            {/* Complete */}
            <tr>
              <td colSpan={2} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>Complete</td>
              {colStats.map((stat, i) => (
                <td key={i} className="p-1 border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                  {stat.completed}
                </td>
              ))}
            </tr>
            {/* Incomplete */}
            <tr>
              <td colSpan={2} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>Incomplete</td>
              {colStats.map((stat, i) => (
                <td key={i} className="p-1 border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--faint)" }}>
                  {stat.incomplete}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
