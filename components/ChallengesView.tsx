import React, { useState } from "react";
import { Challenge } from "@/lib/types";
import { Plus, X, Activity, CheckCircle, Flame, Edit2, MessageSquare, ArrowRight, Zap, Calendar, FileText, Check } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";

interface Props {
  challenges: Challenge[];
  allTargets?: string[];
  dayTargets?: Record<string, boolean>;
  allDays?: Record<string, any>;
  onUpdate: (challenges: Challenge[]) => void;
}

export default function ChallengesView({ challenges, allTargets, dayTargets, allDays, onUpdate }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState(90);
  const [goalsStr, setGoalsStr] = useState("");
  const [preferences, setPreferences] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [status, setStatus] = useState<Challenge["status"]>("active");
  const [logs, setLogs] = useState<{ date: string; note: string }[]>([]);
  const [targetMapping, setTargetMapping] = useState<Record<string, string[]>>({});

  // Inline editing state for active challenge dashboard
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [editingDeadline, setEditingDeadline] = useState("");

  // Check-in state
  const [checkInText, setCheckInText] = useState("");

  const activeChallenge = challenges.find((c) => c.status === "active");
  const pastChallenges = challenges.filter((c) => c.status !== "active");

  const openForm = (c?: Challenge) => {
    if (c) {
      setEditingChallenge(c);
      setName(c.name);
      setStartDate(c.startDate);
      setDuration(c.durationDays);
      setGoalsStr(c.goals.join("\n"));
      setPreferences(c.preferences);
      setActionPlan(c.actionPlan);
      setStatus(c.status);
      setLogs(c.logs || []);
      setTargetMapping(c.targetMapping || {});
    } else {
      setEditingChallenge(null);
      setName("");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setDuration(90);
      setGoalsStr("");
      setPreferences("");
      setActionPlan("");
      setStatus("active");
      setLogs([]);
      setTargetMapping({});
    }
    setIsCreating(true);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingChallenge(null);
  };

  const handleSave = () => {
    if (!name || !startDate) return;

    const newChallenge: Challenge = {
      id: editingChallenge?.id || `challenge-${Date.now()}`,
      name,
      startDate,
      durationDays: duration,
      goals: goalsStr.split("\n").filter((g) => g.trim() !== ""),
      preferences,
      actionPlan,
      status,
      logs,
      targetMapping,
      goalMetadata: editingChallenge?.goalMetadata || {}
    };

    let nextChallenges = [...challenges];
    if (editingChallenge) {
      nextChallenges = nextChallenges.map((c) => (c.id === newChallenge.id ? newChallenge : c));
    } else {
      nextChallenges.push(newChallenge);
    }

    onUpdate(nextChallenges);
    closeForm();
  };

  const handleCheckIn = () => {
    if (!activeChallenge || !checkInText.trim()) return;
    
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const newLogs = [...(activeChallenge.logs || [])];
    
    // Replace if already checked in today, otherwise push
    const existingIdx = newLogs.findIndex(l => l.date === todayStr);
    if (existingIdx !== -1) {
      newLogs[existingIdx].note = checkInText.trim();
    } else {
      newLogs.push({ date: todayStr, note: checkInText.trim() });
    }

    // Sort logs descending by date
    newLogs.sort((a, b) => b.date.localeCompare(a.date));

    const updatedChallenge = { ...activeChallenge, logs: newLogs };
    const nextChallenges = challenges.map(c => c.id === updatedChallenge.id ? updatedChallenge : c);
    
    onUpdate(nextChallenges);
    setCheckInText("");
  };

  const handleSaveGoalMeta = (goal: string) => {
    if (!activeChallenge) return;
    const newMetadata = { ...(activeChallenge.goalMetadata || {}) };
    newMetadata[goal] = { notes: editingNotes.trim(), deadline: editingDeadline };
    const updated = { ...activeChallenge, goalMetadata: newMetadata };
    const nextChallenges = challenges.map(c => c.id === updated.id ? updated : c);
    onUpdate(nextChallenges);
    setEditingGoal(null);
  };

  const renderDashboard = (c: Challenge) => {
    const start = new Date(c.startDate);
    const today = new Date();
    const daysElapsed = differenceInDays(today, start);
    
    const isActive = daysElapsed >= 0 && daysElapsed < c.durationDays;
    const timeProgressPct = Math.min(100, Math.max(0, (daysElapsed / c.durationDays) * 100));
    
    // --- Target Completion Progress Calculation ---
    const mappedTargets = new Set<string>();
    c.goals.forEach(g => {
      if (c.targetMapping && c.targetMapping[g]) {
        c.targetMapping[g].forEach(t => mappedTargets.add(t));
      }
    });

    const activeDaysCount = Math.max(0, Math.min(daysElapsed + 1, c.durationDays));
    const totalPossibleTargets = mappedTargets.size * activeDaysCount;
    let completedTargetsCount = 0;

    if (mappedTargets.size > 0 && allDays) {
      for (let i = 0; i < activeDaysCount; i++) {
        // Construct date correctly handling timezone issues by using the string representation if possible, or addDays
        const dDate = new Date(start);
        dDate.setDate(dDate.getDate() + i);
        const dStr = format(dDate, "yyyy-MM-dd");
        
        const dayData = allDays[dStr];
        if (dayData && dayData.targets) {
          mappedTargets.forEach(t => {
            if (dayData.targets[t]) {
              completedTargetsCount++;
            }
          });
        }
      }
    }

    // If targets are mapped, progress is based on consistency. Otherwise fallback to time elapsed.
    const hasTargets = mappedTargets.size > 0;
    const actionProgressPct = hasTargets && totalPossibleTargets > 0 ? (completedTargetsCount / totalPossibleTargets) * 100 : 0;
    const displayProgressPct = hasTargets ? actionProgressPct : timeProgressPct;

    // Phase logic based on Action Progress if available, else Time Progress
    let phase = 1;
    let phaseName = "Momentum";
    if (displayProgressPct > 33 && displayProgressPct <= 66) {
      phase = 2;
      phaseName = "Endurance";
    } else if (displayProgressPct > 66) {
      phase = 3;
      phaseName = "Mastery";
    }

    // Motivational Context based on Action Progress
    let quote = "The hardest part is starting. Map your targets to begin tracking action.";
    if (hasTargets) {
      if (displayProgressPct === 0) quote = "Action speaks louder than words. Time to execute your targets.";
      else if (displayProgressPct > 0 && displayProgressPct <= 30) quote = "Building the foundation. Consistency is key.";
      else if (displayProgressPct > 30 && displayProgressPct <= 60) quote = "You're building incredible discipline. Don't break the chain.";
      else if (displayProgressPct > 60 && displayProgressPct <= 90) quote = "Over halfway there. High performance is becoming your baseline.";
      else if (displayProgressPct > 90) quote = "Elite consistency. Finish strong!";
      else if (displayProgressPct >= 100) quote = "Flawless Execution! You did it.";
    } else {
      if (timeProgressPct > 10 && timeProgressPct <= 50) quote = "Time is ticking. Start mapping targets.";
    }

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
            Current Arc Active
          </h2>
          <button 
            onClick={() => openForm(c)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--faint)", border: "1px solid var(--border)" }}
          >
            <Edit2 size={12} />
            Configure
          </button>
        </div>

        {/* Dashboard Card */}
        <div 
          className="rounded-2xl border overflow-hidden relative shadow-lg" 
          style={{ background: "var(--surface)", borderColor: "var(--primary)" }}
        >
          {/* Top gradient bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600" />
          
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 flex items-center gap-1">
                    <Zap size={10} /> Phase {phase}: {phaseName}
                  </div>
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    {c.startDate} <ArrowRight size={10} className="inline mx-1" /> {format(new Date(start.getTime() + c.durationDays * 24 * 60 * 60 * 1000), "MMM d")}
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: "var(--text)" }}>{c.name}</h3>
                <p className="text-sm italic mt-2" style={{ color: "var(--faint)" }}>"{quote}"</p>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap gap-4">
                <div className="text-center px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Day</p>
                  <p className="text-2xl font-black">{activeDaysCount}</p>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Total</p>
                  <p className="text-2xl font-black" style={{ color: "var(--faint)" }}>{c.durationDays}</p>
                </div>

                <div className="text-center px-4 py-2 rounded-xl bg-orange-500/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-orange-500">
                    Time Burned
                  </p>
                  <p className="text-2xl font-black text-orange-500">{timeProgressPct.toFixed(0)}%</p>
                </div>

                {hasTargets && (
                  <div className="text-center px-4 py-2 rounded-xl" style={{ background: "rgba(var(--primary-rgb), 0.1)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--primary)" }}>
                      Action Score
                    </p>
                    <p className="text-2xl font-black" style={{ color: "var(--primary)" }}>{actionProgressPct.toFixed(0)}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dual Progress Bars */}
            <div className="mb-8 flex flex-col gap-6">
              
              {/* Action Progress (if targets mapped) */}
              {hasTargets && (
                <div>
                  <div className="flex justify-between mb-2 px-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--primary)" }}>
                      Targets Executed ({completedTargetsCount} / {totalPossibleTargets})
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--primary)" }}>
                      {actionProgressPct.toFixed(0)}% Action
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10 relative">
                    <div 
                      className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${actionProgressPct}%`, background: "var(--primary)" }} 
                    />
                  </div>
                </div>
              )}

              {/* Time Progress */}
              <div>
                <div className="flex justify-between mb-2 px-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500">
                    Time Elapsed
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500">
                    {timeProgressPct.toFixed(0)}% Time
                  </span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10 relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${timeProgressPct}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 md:px-8 pb-8">
              {c.goals.map((g, i) => {
                const mappedTargets = c.targetMapping?.[g] || [];
                const hasMappedTargets = mappedTargets.length > 0;
                const meta = c.goalMetadata?.[g] || {};
                const isEditing = editingGoal === g;

                // Deadline display logic
                let deadlineStr = "";
                let deadlineColor = "var(--faint)";
                if (meta.deadline) {
                   const dlDate = new Date(meta.deadline);
                   if (isToday(dlDate)) { deadlineStr = "Due Today"; deadlineColor = "var(--orange-500)"; }
                   else if (isPast(dlDate)) { deadlineStr = "Overdue"; deadlineColor = "#EF4444"; }
                   else {
                     const diff = differenceInDays(dlDate, new Date());
                     deadlineStr = `${diff} day${diff !== 1 ? 's' : ''} left`;
                     deadlineColor = "var(--primary)";
                   }
                }

                return (
                  <div key={i} className="rounded-xl border relative shadow-sm overflow-hidden flex flex-col bg-black/5 dark:bg-white/5" style={{ borderColor: isEditing ? "var(--primary)" : "var(--s2)" }}>
                    {/* Header */}
                    <div className="p-4 flex flex-col gap-2 border-b" style={{ borderColor: "var(--s2)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                          <h4 className="font-bold text-sm leading-tight" style={{ color: "var(--text)" }}>{g}</h4>
                        </div>
                        {meta.deadline && !isEditing && (
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0" style={{ color: deadlineColor, background: `${deadlineColor}15` }}>
                            {deadlineStr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      {isEditing ? (
                        <div className="space-y-4 animate-in fade-in duration-200 h-full flex flex-col">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--primary)" }}>Target Deadline</label>
                            <input 
                              type="date" 
                              className="input-field w-full text-xs py-2 bg-transparent border-primary/30 focus:border-primary"
                              value={editingDeadline}
                              onChange={(e) => setEditingDeadline(e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--primary)" }}>Commitment Notes</label>
                            <textarea 
                              className="input-field w-full text-xs py-2 min-h-[100px] h-full bg-transparent border-primary/30 focus:border-primary"
                              placeholder="Why is this important? Any key milestones?"
                              value={editingNotes}
                              onChange={(e) => setEditingNotes(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button 
                              onClick={() => setEditingGoal(null)}
                              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveGoalMeta(g)}
                              className="btn-primary px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-md hover:scale-105 transition-transform flex items-center gap-1.5"
                            >
                              <Check size={12} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="animate-in fade-in duration-300 h-full flex flex-col justify-between">
                          <div className="space-y-4 mb-4">
                            {/* Read-only metadata */}
                            {(meta.deadline || meta.notes) ? (
                              <div className="space-y-3">
                                {meta.deadline && (
                                  <div className="flex items-center gap-2">
                                    <Calendar size={12} style={{ color: deadlineColor }} />
                                    <span className="text-xs font-medium" style={{ color: deadlineColor }}>
                                      {format(new Date(meta.deadline), "MMMM d, yyyy")}
                                    </span>
                                  </div>
                                )}
                                {meta.notes && (
                                  <div className="flex items-start gap-2">
                                    <FileText size={12} className="mt-0.5 text-blue-500 shrink-0" />
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--faint)" }}>
                                      {meta.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs italic opacity-50">No deadline or notes set.</p>
                            )}
                            
                            {/* Mapped Targets */}
                            {hasMappedTargets && (
                              <div className="pt-3 border-t border-dashed" style={{ borderColor: "var(--s2)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Mapped Targets</p>
                                <ul className="space-y-2">
                                  {mappedTargets.map(tName => {
                                    const isDone = dayTargets?.[tName];
                                    return (
                                      <li key={tName} className="flex items-center gap-2 text-xs" style={{ color: isDone ? "var(--emerald-500)" : "var(--faint)" }}>
                                        {isDone ? (
                                          <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                        ) : (
                                          <div className="w-3 h-3 rounded-sm border shrink-0" style={{ borderColor: "var(--faint)" }} />
                                        )}
                                        <span className={isDone ? "line-through opacity-80" : "font-medium"}>{tName}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex justify-end mt-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDeadline(meta.deadline || "");
                                setEditingNotes(meta.notes || "");
                                setEditingGoal(g);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-blue-500"
                            >
                              <Edit2 size={10} /> Edit Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Split Section: Preferences, Action Plan, Daily Check-in */}
            <div className="px-6 md:px-8 pb-8 border-t pt-8" style={{ borderColor: "var(--s2)" }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Area: Preferences & Action Plan */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border" style={{ borderColor: "var(--s2)", background: "var(--bg)" }}>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Preferences</h4>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--faint)" }}>
                      {c.preferences || "None set."}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border" style={{ borderColor: "var(--s2)", background: "var(--bg)" }}>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Action Plan</h4>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--faint)" }}>
                      {c.actionPlan || "None set."}
                    </p>
                  </div>
                </div>

              {/* Right Area: Daily Check-in & Logs */}
              <div className="lg:col-span-1 flex flex-col h-full">
                <h4 className="text-sm font-bold flex items-center gap-1.5 mb-3 uppercase tracking-wider" style={{ color: "var(--text)" }}>
                  <MessageSquare size={14} className="text-purple-500" />
                  Daily Check-in
                </h4>
                
                <div className="flex-1 rounded-xl border flex flex-col overflow-hidden" style={{ borderColor: "var(--s2)", background: "var(--bg)" }}>
                  <div className="p-4 border-b" style={{ borderColor: "var(--s2)" }}>
                    <textarea
                      className="w-full bg-transparent text-sm resize-none focus:outline-none"
                      rows={3}
                      placeholder="How did today go? Any blockers?"
                      value={checkInText}
                      onChange={(e) => setCheckInText(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{format(new Date(), "MMM d, yyyy")}</span>
                      <button 
                        onClick={handleCheckIn}
                        disabled={!checkInText.trim()}
                        className="btn-primary px-3 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50"
                      >
                        Log Entry
                      </button>
                    </div>
                  </div>
                  
                  {/* Log History */}
                  <div className="flex-1 p-4 overflow-y-auto max-h-[250px] space-y-4">
                    {c.logs && c.logs.length > 0 ? (
                      c.logs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--primary)" }} />
                          <div>
                            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--muted)" }}>
                              {log.date}
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--faint)" }}>
                              {log.note}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-sm italic opacity-50">
                        No check-ins logged yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-24 fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 primary-text">
            <Flame size={24} className="text-orange-500" />
            Challenges
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>
            Custom arcs and long-term commitments.
          </p>
        </div>
        {!activeChallenge && (
          <button
            onClick={() => openForm()}
            className="btn-primary px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5"
          >
            <Plus size={16} />
            New Challenge
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="p-4 md:p-8 rounded-2xl border mb-8 shadow-xl relative overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{editingChallenge ? "Edit Challenge" : "Create Challenge"}</h2>
            <button onClick={closeForm} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Name (e.g. Winter Arc)</label>
              <input
                type="text"
                className="input-field w-full text-lg font-medium py-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Start Date</label>
                <input
                  type="date"
                  className="input-field w-full py-3"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Duration (Days)</label>
                <input
                  type="number"
                  className="input-field w-full py-3"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Status</label>
            <select
              className="input-field w-full py-3"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Goals / Commitments (One per line)</label>
            <textarea
              className="input-field w-full min-h-[120px] py-3 leading-relaxed"
              value={goalsStr}
              onChange={(e) => setGoalsStr(e.target.value)}
              placeholder="- Wake up at 5 AM\n- Workout 1hr\n- No sugar"
            />
          </div>

          {allTargets && allTargets.length > 0 && (
            <div className="mb-6 p-4 md:p-6 rounded-xl border" style={{ borderColor: "var(--s2)", background: "var(--bg)" }}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text)" }}>Map Daily Targets to Commitments</label>
              <p className="text-[10px] mb-4" style={{ color: "var(--faint)" }}>Assign your existing Daily Targets to your arc commitments.</p>
              
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {allTargets.map(targetName => {
                  let currentMappedGoal = "";
                  Object.entries(targetMapping).forEach(([goal, targets]) => {
                    if (targets.includes(targetName)) currentMappedGoal = goal;
                  });
                  
                  const goalsList = goalsStr.split("\n").map(g => g.trim()).filter(Boolean);

                  return (
                    <div key={targetName} className="flex items-center justify-between gap-4 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <span className="text-sm font-semibold truncate flex-1">{targetName}</span>
                      <select 
                        className="text-xs p-2 rounded-lg bg-transparent border flex-1 outline-none focus:border-primary"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        value={currentMappedGoal}
                        onChange={(e) => {
                          const newGoal = e.target.value;
                          const newMapping = { ...targetMapping };
                          Object.keys(newMapping).forEach(g => {
                            newMapping[g] = newMapping[g].filter(t => t !== targetName);
                          });
                          if (newGoal) {
                            if (!newMapping[newGoal]) newMapping[newGoal] = [];
                            newMapping[newGoal].push(targetName);
                          }
                          setTargetMapping(newMapping);
                        }}
                      >
                        <option value="">-- Unassigned --</option>
                        {goalsList.map((g, i) => (
                          <option key={i} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Preferences</label>
              <textarea
                className="input-field w-full min-h-[120px] py-3 leading-relaxed"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="I prefer to workout in the mornings and read at night..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Action Plan</label>
              <textarea
                className="input-field w-full min-h-[120px] py-3 leading-relaxed"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="I will set my alarm across the room. I will prep my meals on Sundays..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: "var(--s2)" }}>
            <button onClick={closeForm} className="px-6 py-2.5 text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium">Cancel</button>
            <button onClick={handleSave} className="btn-primary px-8 py-2.5 text-sm rounded-lg font-bold shadow-lg hover:opacity-90 transition-opacity">Save Challenge</button>
          </div>
        </div>
      ) : null}

      {/* Active Challenge */}
      {!isCreating && activeChallenge && renderDashboard(activeChallenge)}

      {/* Past Challenges */}
      {!isCreating && pastChallenges.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <Activity size={14} /> Challenge Archive
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastChallenges.map((c) => (
              <div key={c.id} className="p-5 rounded-xl border relative group" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{c.name}</h4>
                    <p className="text-xs font-mono mt-1" style={{ color: "var(--muted)" }}>{c.durationDays} Days • {c.startDate}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${c.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: "var(--faint)" }}>
                  {c.goals.join(" • ")}
                </p>
                <button 
                  onClick={() => openForm(c)} 
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isCreating && !activeChallenge && pastChallenges.length === 0 && (
        <div className="text-center py-24 px-4 border rounded-2xl shadow-sm" style={{ borderColor: "var(--s2)", background: "var(--surface)" }}>
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <Flame size={40} className="text-orange-500" />
          </div>
          <h3 className="text-2xl font-black mb-3 tracking-tight">No active challenges</h3>
          <p className="text-base max-w-md mx-auto mb-8 leading-relaxed" style={{ color: "var(--faint)" }}>
            Start a new Winter Arc, 75 Hard, or create your own custom challenge to build discipline and track your progress over time.
          </p>
          <button onClick={() => openForm()} className="btn-primary px-6 py-3 text-sm font-bold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            <Plus size={18} /> Configure Your First Arc
          </button>
        </div>
      )}

    </div>
  );
}
