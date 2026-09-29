"use client";

import { useState, useEffect } from "react";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameMonth, isBefore, isAfter, differenceInDays } from "date-fns";
import { AppData, TargetMeta } from "@/lib/types";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
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
  const [rewardTarget, setRewardTarget] = useState("");

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStr = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    const saved = localStorage.getItem(`reward_target_${monthStr}`);
    setRewardTarget(saved || "");
  }, [monthStr]);

  // Calculate currentMonthlyTargets (aggregate unachieved targets from past + current month targets)
  let currentMonthlyTargets: TargetMeta[] = [];
  if (data.monthlyTargets) {
    const targetMap = new Map<string, TargetMeta>();
    const viewedMonthStart = startOfMonth(currentMonth);
    
    Object.keys(data.monthlyTargets).sort().forEach(m => {
      if (m <= monthStr) {
        for (const t of data.monthlyTargets![m]) {
          if (t.accomplishedAt === "dropped") {
            targetMap.delete(t.name);
            continue;
          }
          if (t.accomplishedAt) {
             const accDate = new Date(t.accomplishedAt);
             if (isBefore(accDate, viewedMonthStart)) continue;
          }
          targetMap.set(t.name, t);
        }
      }
    });
    currentMonthlyTargets = Array.from(targetMap.values());
  } else if (data.targets && data.targets.length > 0) {
    currentMonthlyTargets = data.targets.map(t => ({ name: t }));
  }
  
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
    if (!onUpdateTargets || !data.monthlyTargets) return;
    
    const newMap = { ...data.monthlyTargets };
    let updated = false;
    
    Object.keys(newMap).forEach(m => {
      newMap[m] = newMap[m].map(t => {
        if (t.name === target.name && !updated) {
          updated = true;
          if (t.accomplishedAt) {
            return { ...t, accomplishedAt: null }; // Un-accomplish
          } else {
            const now = new Date();
            const accomplishDate = isSameMonth(currentMonth, now) 
              ? format(now, "yyyy-MM-dd") 
              : `${monthStr}-${daysInMonth.toString().padStart(2, "0")}`;
            return { ...t, accomplishedAt: accomplishDate };
          }
        }
        return t;
      });
    });

    onUpdateTargets(newMap);
  };

  const handleSaveEdit = () => {
    if (!onUpdateTargets || !data.monthlyTargets) return;
    
    const newMap = { ...data.monthlyTargets };
    const viewedMonthStart = startOfMonth(currentMonth);

    // Find targets active in previous months
    const previousActiveMap = new Map<string, TargetMeta>();
    Object.keys(newMap).sort().forEach(m => {
      if (m < monthStr) {
        for (const t of newMap[m]) {
          if (t.accomplishedAt === "dropped") {
            previousActiveMap.delete(t.name);
            continue;
          }
          if (t.accomplishedAt) {
             const accDate = new Date(t.accomplishedAt);
             if (isBefore(accDate, viewedMonthStart)) continue;
          }
          previousActiveMap.set(t.name, t);
        }
      }
    });

    const currentMonthSavedTargets: TargetMeta[] = [];
    
    // 1. Handle surviving and new targets
    localTargets.forEach(lt => {
      if (!previousActiveMap.has(lt.name)) {
        // It's a new target for this month (or re-added)
        currentMonthSavedTargets.push(lt);
      }
    });

    // 2. Handle deletions of carried-over targets
    previousActiveMap.forEach((prevTarget, name) => {
      if (!localTargets.some(lt => lt.name === name)) {
        // User deleted it this month, so we drop it
        currentMonthSavedTargets.push({ name, accomplishedAt: "dropped", createdAt: prevTarget.createdAt });
      }
    });

    // 3. Keep any target that originated THIS month and was preserved in localTargets
    // Wait, the step 1 already covers this because they aren't in previousActiveMap!
    // So step 1 perfectly preserves localTargets that are unique to this month.

    newMap[monthStr] = currentMonthSavedTargets;
    
    onUpdateTargets(newMap);
    setIsEditing(false);
  };

  const now = new Date();
  
  const rowStats = currentMonthlyTargets.map(targetMeta => {
    const target = targetMeta.name;
    let completed = 0;

    const startOfCurrentMonth = startOfMonth(currentMonth);
    const endOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), daysInMonth);
    
    let startDay = 1;
    if (targetMeta.createdAt) {
      const createdDate = new Date(targetMeta.createdAt);
      if (isSameMonth(createdDate, currentMonth)) {
        startDay = createdDate.getDate();
      } else if (isAfter(createdDate, endOfCurrentMonth)) {
        startDay = daysInMonth + 1; 
      }
    }
    
    let endDay = daysInMonth;
    if (targetMeta.accomplishedAt) {
      const accDate = new Date(targetMeta.accomplishedAt);
      if (isSameMonth(accDate, currentMonth)) {
        endDay = accDate.getDate();
      } else if (isBefore(accDate, startOfCurrentMonth)) {
        endDay = 0;
      }
    }
    
    // Now total days in THIS month that are active for this target:
    const activeDaysCount = Math.max(1, endDay - startDay + 1);
    
    // And elapsed days in THIS month for this target:
    let elapsedEndDay = isSameMonth(now, currentMonth) ? now.getDate() : (isAfter(now, endOfCurrentMonth) ? daysInMonth : 0);
    elapsedEndDay = Math.min(elapsedEndDay, endDay);
    const targetElapsedDays = Math.max(0, elapsedEndDay - startDay + 1);

    days.forEach((dateStr, idx) => {
      const dayData = data.days[dateStr];
      const dayNum = idx + 1;
      if (dayNum >= startDay && dayNum <= endDay) {
        if (dayData?.targets?.[target]) {
          completed++;
        }
      }
    });

    return { 
      targetMeta, 
      completed, 
      percent: Math.round((completed / (activeDaysCount || 1)) * 100), 
      expected: Math.round((targetElapsedDays / (activeDaysCount || 1)) * 100) + "%",
      targetElapsedDays
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
  let totalElapsedDays = 0;
  let totalCompleted = 0;
  rowStats.forEach(r => {
    totalElapsedDays += r.targetElapsedDays;
    totalCompleted += r.completed;
  });
  
  const currentLevelNum = totalElapsedDays > 0 ? (totalCompleted / totalElapsedDays) * 100 : 0;
  const currentLevel = currentLevelNum.toFixed(2);
  
  let rankStr = "E";
  let rankColor = "text-red-400";
  let rankLabel = "Needs Work";
  if (currentLevelNum >= 90) { rankStr = "S"; rankColor = "text-amber-500"; rankLabel = "Legendary"; }
  else if (currentLevelNum >= 80) { rankStr = "A"; rankColor = "text-purple-500"; rankLabel = "Elite"; }
  else if (currentLevelNum >= 70) { rankStr = "B"; rankColor = "text-blue-500"; rankLabel = "Solid"; }
  else if (currentLevelNum >= 50) { rankStr = "C"; rankColor = "text-emerald-500"; rankLabel = "Average"; }

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
                            setLocalTargets([...localTargets, { name: newTarget.trim(), createdAt: format(new Date(), "yyyy-MM-dd") }]);
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
                           setLocalTargets([...localTargets, { name: newTarget.trim(), createdAt: format(new Date(), "yyyy-MM-dd") }]);
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
        <div className="p-4 rounded-xl flex items-center justify-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl font-black text-2xl" style={{ backgroundColor: "var(--s2)", border: `1px solid var(--border)` }}>
            <span className={rankColor}>{rankStr}</span>
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Rank Status</p>
            <p className={`font-bold ${rankColor}`}>{rankLabel}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl text-center space-y-1 flex flex-col justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--faint)" }}>Reward Target</p>
          <input 
            type="text" 
            value={rewardTarget}
            onChange={(e) => {
              setRewardTarget(e.target.value);
              localStorage.setItem(`reward_target_${monthStr}`, e.target.value);
            }}
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
              {days.map((dateStr, i) => {
                const isChallengeActiveOnDate = !!data.challenges?.find(c => {
                  if (c.status !== "active") return false;
                  const cStart = new Date(c.startDate);
                  const date = new Date(dateStr);
                  const diff = differenceInDays(date, cStart);
                  return diff >= 0 && diff < c.durationDays;
                });
                return (
                  <th key={i} className={`p-2 border font-medium w-8 text-[10px] ${isChallengeActiveOnDate ? "bg-orange-500/5 dark:bg-orange-500/10" : ""}`} style={{ borderColor: "var(--border)", color: "var(--faint)" }}>
                    <div className="flex flex-col items-center leading-tight gap-0.5">
                      <span className="opacity-50 text-[8px] uppercase">{format(new Date(dateStr), "EEE")}</span>
                      <span className="text-xs">{i + 1}</span>
                    </div>
                  </th>
                );
              })}
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
              const isAccomplished = !!targetMeta.accomplishedAt && targetMeta.accomplishedAt !== "dropped" && targetMeta.accomplishedAt <= `${monthStr}-31`;
              let accomplishedDay = -1;
              if (isAccomplished && targetMeta.accomplishedAt?.startsWith(monthStr)) {
                accomplishedDay = parseInt(targetMeta.accomplishedAt.split("-")[2], 10);
              }

              // Apply a very subtle deterministic tint to each row to help the eyes track horizontally
              const rowColors = [
                "bg-blue-500/[0.03] dark:bg-blue-500/10",
                "bg-purple-500/[0.03] dark:bg-purple-500/10",
                "bg-emerald-500/[0.03] dark:bg-emerald-500/10",
                "bg-amber-500/[0.03] dark:bg-amber-500/10",
                "bg-rose-500/[0.03] dark:bg-rose-500/10",
                "bg-indigo-500/[0.03] dark:bg-indigo-500/10",
                "bg-teal-500/[0.03] dark:bg-teal-500/10"
              ];
              const rowBg = rowColors[rowIdx % rowColors.length];

              return (
                <tr key={targetMeta.name} className={`hover:brightness-95 dark:hover:brightness-110 transition-all ${rowBg}`}>
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
                    const todayStr = format(now, "yyyy-MM-dd");
                    const isFuture = dateStr > todayStr;
                    const isDisabled = isFuture || (isAccomplished && dayNum > accomplishedDay && accomplishedDay !== -1);
                    
                    const isChallengeActiveOnDate = !!data.challenges?.find(c => {
                      if (c.status !== "active") return false;
                      const cStart = new Date(c.startDate);
                      const date = new Date(dateStr);
                      const diff = differenceInDays(date, cStart);
                      return diff >= 0 && diff < c.durationDays;
                    });

                    let cellBg = "";
                    if (isDisabled) cellBg = "bg-[var(--s2)] opacity-30";
                    else if (isChallengeActiveOnDate) cellBg = "bg-orange-500/5 dark:bg-orange-500/10";

                    return (
                      <td key={colIdx} className={`p-0 border relative ${cellBg}`} style={{ borderColor: "var(--border)" }}>
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
            {/* ECG Trendline Row */}
            <tr>
              <td colSpan={4} className="p-2 border font-medium text-right text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--s2)" }}>
                Trend
              </td>
              <td colSpan={days.length} className="p-0 border relative" style={{ borderColor: "var(--border)", background: "var(--s2)" }}>
                <div className="w-full h-12 opacity-80 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={colStats.map((s, i) => ({ day: i + 1, percent: s.percent }))} margin={{ top: 5, right: 16, left: 16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="percent" 
                        stroke="var(--primary)" 
                        fillOpacity={1} 
                        fill="url(#colorPercent)" 
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </td>
            </tr>
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
