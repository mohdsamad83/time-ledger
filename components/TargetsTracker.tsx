"use client";

import { useState, useEffect } from "react";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameMonth, isBefore } from "date-fns";
import { AppData, TargetMeta } from "@/lib/types";
import { ChevronLeft, ChevronRight, Target, X, ChevronDown, Trophy, CheckCircle2 } from "lucide-react";

interface Props {
  data: AppData;
  onToggle: (date: string, targetName: string) => void;
  onUpdateTargets?: (monthlyTargets: Record<string, TargetMeta[]>) => void;
}

export default function TargetsTracker({ data, onToggle, onUpdateTargets }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isEditing, setIsEditing] = useState(false);
  const [localTargets, setLocalTargets] = useState<TargetMeta[]>([]);
  const [newTarget, setNewTarget] = useState("");

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStr = format(currentMonth, "yyyy-MM");

  // Get current month's targets, fallback to legacy global targets if none configured for this month
  const currentMonthlyTargets: TargetMeta[] = data.monthlyTargets?.[monthStr] || 
    (data.targets && data.targets.length > 0 ? data.targets.map(t => ({ name: t })) : []);
  
  useEffect(() => {
    if (isEditing) {
      setLocalTargets([...currentMonthlyTargets]);
    }
  }, [isEditing, monthStr, data.monthlyTargets, data.targets]);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${monthStr}-${d.toString().padStart(2, "0")}`;
  });

  const handleAccomplishToggle = (target: TargetMeta) => {
    if (!onUpdateTargets) return;
    
    // Create updated list
    const updated = currentMonthlyTargets.map(t => {
      if (t.name === target.name) {
        if (t.accomplishedAt) {
          return { ...t, accomplishedAt: null }; // Un-accomplish
        } else {
          // Default to today if it's the current month, else the last day of that month
          const now = new Date();
          const accomplishDate = isSameMonth(currentMonth, now) 
            ? format(now, "yyyy-MM-dd") 
            : `${monthStr}-${daysInMonth.toString().padStart(2, "0")}`;
          return { ...t, accomplishedAt: accomplishDate };
        }
      }
      return t;
    });

    const newMap = { ...data.monthlyTargets, [monthStr]: updated };
    onUpdateTargets(newMap);
  };

  const handleSaveEdit = () => {
    if (!onUpdateTargets) return;
    const newMap = { ...data.monthlyTargets, [monthStr]: localTargets };
    onUpdateTargets(newMap);
    setIsEditing(false);
  };

  // Stats calculation
  const now = new Date();
  let baseElapsedDays = 0;
  if (isSameMonth(currentMonth, now)) {
    baseElapsedDays = now.getDate();
  } else if (isBefore(currentMonth, now)) {
    baseElapsedDays = daysInMonth;
  }

  const rowStats = currentMonthlyTargets.map(targetMeta => {
    const target = targetMeta.name;
    let completed = 0;
    
    // Determine active days for this target
    let activeDaysCount = daysInMonth;
    let targetElapsedDays = baseElapsedDays;
    let accomplishedDay = -1;

    if (targetMeta.accomplishedAt && targetMeta.accomplishedAt.startsWith(monthStr)) {
      accomplishedDay = parseInt(targetMeta.accomplishedAt.split("-")[2], 10);
      activeDaysCount = accomplishedDay; // Only require days up to the accomplishment
      if (targetElapsedDays > accomplishedDay) {
        targetElapsedDays = accomplishedDay;
      }
    }

    days.forEach((dateStr, idx) => {
      const dayData = data.days[dateStr];
      const dayNum = idx + 1;
      // We only count completions up to the accomplished date if it is accomplished.
      // Actually, if it's accomplished, they can't check days after it anyway.
      if (dayData?.targets?.[target]) {
        completed++;
      }
    });

    return { 
      targetMeta, 
      completed, 
      percent: Math.round((completed / (activeDaysCount || 1)) * 100), 
      expected: Math.round((targetElapsedDays / (activeDaysCount || 1)) * 100) + "%" 
    };
  });

  const colStats = days.map((dateStr, idx) => {
    const dayData = data.days[dateStr];
    const dayNum = idx + 1;
    let completed = 0;
    let applicableTargets = 0;

    currentMonthlyTargets.forEach(t => {
      let isApplicable = true;
      if (t.accomplishedAt && t.accomplishedAt.startsWith(monthStr)) {
         const accDay = parseInt(t.accomplishedAt.split("-")[2], 10);
         if (dayNum > accDay) isApplicable = false;
      }
      
      if (isApplicable) {
        applicableTargets++;
        if (dayData?.targets?.[t.name]) completed++;
      }
    });

    return {
      completed,
      incomplete: applicableTargets - completed,
      percent: Math.round((completed / (applicableTargets || 1)) * 100)
    };
  });

  // Overall stats
  let totalPossible = 0;
  let totalCompleted = 0;
  rowStats.forEach(r => {
    const activeDays = r.targetMeta.accomplishedAt && r.targetMeta.accomplishedAt.startsWith(monthStr)
      ? parseInt(r.targetMeta.accomplishedAt.split("-")[2], 10) 
      : daysInMonth;
    totalPossible += activeDays;
    totalCompleted += r.completed;
  });
  
  const currentLevel = totalPossible > 0 ? ((totalCompleted / totalPossible) * 100).toFixed(2) : "0.00";
  const lostLevel = totalPossible > 0 ? (100 - parseFloat(currentLevel)).toFixed(2) : "0.00";

  return (
    <div className="w-full px-4 mx-auto space-y-6 fade-up">
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
            <div className="relative">
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-2"
                style={{ background: isEditing ? "var(--s2)" : "transparent" }}
              >
                Edit Targets / Set Priorities
                <ChevronDown size={14} className={`transition-transform ${isEditing ? "rotate-180" : ""}`} />
              </button>

              {isEditing && (
                <div className="absolute right-0 top-full mt-2 w-80 p-5 rounded-xl shadow-2xl z-50 fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "var(--text)" }}>Manage Targets for {format(currentMonth, "MMM yyyy")}</h3>
                  
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 mb-4">
                     {localTargets.length === 0 && <span className="text-xs text-[var(--faint)]">No targets added yet.</span>}
                     {localTargets.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
                          <span style={{ color: "var(--text)" }} className="truncate">{t.name}</span>
                          <button 
                            onClick={() => setLocalTargets(localTargets.filter((_, i) => i !== idx))} 
                            className="hover:text-red-400 transition-colors shrink-0"
                            style={{ color: "var(--faint)" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                     ))}
                  </div>

                  <div className="flex gap-2 mb-5">
                    <input 
                      value={newTarget}
                      onChange={e => setNewTarget(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newTarget.trim()) {
                          if (!localTargets.find(t => t.name === newTarget.trim())) {
                            setLocalTargets([...localTargets, { name: newTarget.trim() }]);
                          }
                          setNewTarget("");
                        }
                      }}
                      placeholder="New Target Name..."
                      className="px-3 py-2 text-xs rounded-lg border bg-transparent flex-1 focus:outline-none"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    <button 
                       onClick={() => { 
                         if (newTarget.trim() && !localTargets.find(t => t.name === newTarget.trim())) {
                           setLocalTargets([...localTargets, { name: newTarget.trim() }]);
                           setNewTarget("");
                         }
                       }}
                       className="p-2 rounded-lg btn-ghost flex items-center justify-center shrink-0"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="btn-ghost flex-[1] text-xs py-2.5"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="btn-primary flex-[2] text-xs py-2.5"
                    >
                      Save to Ledger ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <th className="p-2 border font-medium w-16" title="Mark Accomplished" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                Done?
              </th>
              <th className="p-2 border font-medium w-16" title="Ideal completion by today" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                Ideal
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
            {currentMonthlyTargets.length === 0 && (
               <tr>
                 <td colSpan={days.length + 4} className="p-8 text-center text-[var(--faint)]">
                   No targets configured for this month. Click "Edit Targets" to add some!
                 </td>
               </tr>
            )}
            {currentMonthlyTargets.map((targetMeta, rowIdx) => {
              const stat = rowStats[rowIdx];
              const isAccomplished = !!targetMeta.accomplishedAt;
              let accomplishedDay = -1;
              if (isAccomplished && targetMeta.accomplishedAt?.startsWith(monthStr)) {
                accomplishedDay = parseInt(targetMeta.accomplishedAt.split("-")[2], 10);
              }

              return (
                <tr key={targetMeta.name} className="hover:bg-white/5 transition-colors">
                  <td className="p-2 border font-semibold text-left text-xs truncate" style={{ borderColor: "var(--border)", color: isAccomplished ? "var(--emerald-500)" : "var(--text)" }}>
                    <span className="flex items-center gap-1.5">
                      {isAccomplished && <CheckCircle2 size={12} className="text-emerald-500" />}
                      <span className={isAccomplished ? "line-through opacity-70" : ""}>{targetMeta.name}</span>
                    </span>
                  </td>
                  <td className="p-2 border" style={{ borderColor: "var(--border)" }}>
                     <button
                       onClick={() => handleAccomplishToggle(targetMeta)}
                       className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all ${
                         isAccomplished ? "bg-emerald-500/20 text-emerald-500" : "hover:bg-white/10 text-[var(--faint)]"
                       }`}
                       title={isAccomplished ? `Accomplished on ${targetMeta.accomplishedAt}` : "Mark as Accomplished"}
                     >
                       <Trophy size={12} />
                     </button>
                  </td>
                  <td className="p-2 border text-xs font-bold text-[var(--faint)]" style={{ borderColor: "var(--border)" }}>
                    {stat.expected}
                  </td>
                  <td className="p-2 border text-xs font-bold" style={{ borderColor: "var(--border)", color: "var(--primary)" }}>
                    {stat.percent}%
                  </td>
                  {days.map((dateStr, colIdx) => {
                    const dayNum = colIdx + 1;
                    const isCompleted = data.days[dateStr]?.targets?.[targetMeta.name] || false;
                    const isDisabled = isAccomplished && dayNum > accomplishedDay && accomplishedDay !== -1;

                    return (
                      <td key={colIdx} className={`p-0 border relative ${isDisabled ? "bg-[var(--s2)] opacity-30" : ""}`} style={{ borderColor: "var(--border)" }}>
                        <button
                          disabled={isDisabled}
                          onClick={() => onToggle(dateStr, targetMeta.name)}
                          className="w-full h-full min-h-[30px] flex items-center justify-center transition-colors hover:bg-white/10 disabled:hover:bg-transparent"
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
              <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>Progress %</td>
              {colStats.map((stat, i) => (
                <td key={i} className="p-1 border text-[10px] font-bold" style={{ borderColor: "var(--border)", color: "var(--primary)", background: "var(--s2)" }}>
                  {stat.percent}%
                </td>
              ))}
            </tr>
            {/* Complete */}
            <tr>
              <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>Complete</td>
              {colStats.map((stat, i) => (
                <td key={i} className="p-1 border text-[10px]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                  {stat.completed}
                </td>
              ))}
            </tr>
            {/* Incomplete */}
            <tr>
              <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>Incomplete</td>
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
