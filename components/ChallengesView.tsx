import React, { useState } from "react";
import { Challenge } from "@/lib/types";
import { Plus, Target, CalendarDays, CheckCircle, Flame, Edit2, X, Activity } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Props {
  challenges: Challenge[];
  onUpdate: (challenges: Challenge[]) => void;
}

export default function ChallengesView({ challenges, onUpdate }: Props) {
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
    } else {
      setEditingChallenge(null);
      setName("");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setDuration(90);
      setGoalsStr("");
      setPreferences("");
      setActionPlan("");
      setStatus("active");
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
    };

    let nextChallenges = [...challenges];
    
    // If making this one active, complete other active ones?
    // Actually, maybe allow multiple, but the UI prioritizes the first active one. Let's just update the array.
    if (editingChallenge) {
      nextChallenges = nextChallenges.map((c) => (c.id === newChallenge.id ? newChallenge : c));
    } else {
      nextChallenges.push(newChallenge);
    }

    onUpdate(nextChallenges);
    closeForm();
  };

  const renderProgress = (c: Challenge) => {
    const start = new Date(c.startDate);
    const today = new Date();
    const daysElapsed = differenceInDays(today, start);
    
    let label = "";
    let progress = 0;
    
    if (daysElapsed < 0) {
      label = `Starts in ${Math.abs(daysElapsed)} days`;
      progress = 0;
    } else if (daysElapsed >= c.durationDays) {
      label = `Completed (${c.durationDays} Days)`;
      progress = 100;
    } else {
      label = `Day ${daysElapsed + 1} of ${c.durationDays}`;
      progress = Math.min(100, Math.max(0, (daysElapsed / c.durationDays) * 100));
    }

    return (
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
          <span>{label}</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--s2)" }}>
          <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--primary)" }} />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-24 fade-in">
      
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
        <button
          onClick={() => openForm()}
          className="btn-primary px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5"
        >
          <Plus size={16} />
          New Challenge
        </button>
      </div>

      {isCreating ? (
        <div className="p-4 md:p-6 rounded-xl border mb-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{editingChallenge ? "Edit Challenge" : "Create Challenge"}</h2>
            <button onClick={closeForm} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Name (e.g. Winter Arc)</label>
              <input
                type="text"
                className="input-field w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Start Date</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Duration (Days)</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Status</label>
            <select
              className="input-field w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Goals / Commitments (One per line)</label>
            <textarea
              className="input-field w-full min-h-[100px]"
              value={goalsStr}
              onChange={(e) => setGoalsStr(e.target.value)}
              placeholder="- Wake up at 5 AM\n- Workout 1hr\n- No sugar"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Preferences (What you prefer doing)</label>
              <textarea
                className="input-field w-full min-h-[100px]"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="I prefer to workout in the mornings and read at night..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Action Plan (How to take action)</label>
              <textarea
                className="input-field w-full min-h-[100px]"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="I will set my alarm across the room. I will prep my meals on Sundays..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={closeForm} className="btn-ghost px-4 py-2 text-sm rounded">Cancel</button>
            <button onClick={handleSave} className="btn-primary px-4 py-2 text-sm rounded font-bold">Save Challenge</button>
          </div>
        </div>
      ) : null}

      {/* Active Challenge */}
      {!isCreating && activeChallenge && (
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Current Arc</h2>
          <div className="p-5 md:p-6 rounded-xl border relative" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <button 
              onClick={() => openForm(activeChallenge)}
              className="absolute top-4 right-4 p-2 rounded text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: "var(--faint)" }}
            >
              <Edit2 size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500">
                <Flame size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold">{activeChallenge.name}</h3>
                <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--muted)" }}>
                  <CalendarDays size={12} />
                  {activeChallenge.startDate} — {format(new Date(new Date(activeChallenge.startDate).getTime() + activeChallenge.durationDays * 24 * 60 * 60 * 1000), "MMM d, yyyy")}
                </div>
              </div>
            </div>

            {renderProgress(activeChallenge)}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t" style={{ borderColor: "var(--s2)" }}>
              {/* Goals */}
              <div className="md:col-span-1">
                <h4 className="text-sm font-bold flex items-center gap-1.5 mb-3">
                  <Target size={14} className="text-blue-400" />
                  Commitments
                </h4>
                <ul className="space-y-2">
                  {activeChallenge.goals.map((g, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--faint)" }}>
                      <CheckCircle size={14} className="mt-0.5 text-green-500/50" />
                      <span className="leading-tight">{g}</span>
                    </li>
                  ))}
                  {activeChallenge.goals.length === 0 && <span className="text-xs italic opacity-50">No goals set</span>}
                </ul>
              </div>

              {/* Prefs / Actions */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Preferences</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--faint)" }}>
                    {activeChallenge.preferences || <span className="italic opacity-50">None</span>}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Action Plan</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--faint)" }}>
                    {activeChallenge.actionPlan || <span className="italic opacity-50">None</span>}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-lg border border-dashed text-center flex flex-col items-center justify-center gap-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <Activity size={20} style={{ color: "var(--muted)" }}/>
                <p className="text-sm" style={{ color: "var(--faint)" }}>Log your daily actions directly in the <strong className="primary-text">Today</strong> tab timeline.</p>
            </div>
          </div>
        </div>
      )}

      {/* Past Challenges */}
      {!isCreating && pastChallenges.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Past Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastChallenges.map((c) => (
              <div key={c.id} className="p-4 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{c.name}</h4>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{c.durationDays} Days • {c.startDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {c.status}
                    </span>
                    <button onClick={() => openForm(c)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-xs">
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--faint)" }}>
                  {c.goals.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isCreating && !activeChallenge && pastChallenges.length === 0 && (
        <div className="text-center py-16 px-4 border rounded-xl" style={{ borderColor: "var(--s2)", background: "var(--surface)" }}>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: "var(--s2)" }}>
            <Flame size={32} style={{ color: "var(--muted)" }} />
          </div>
          <h3 className="text-lg font-bold mb-2">No active challenges</h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--faint)" }}>
            Start a new Winter Arc, 75 Hard, or create your own custom challenge to build discipline and track your progress over time.
          </p>
          <button onClick={() => openForm()} className="btn-primary px-4 py-2 text-sm font-bold rounded-lg inline-flex items-center gap-2">
            <Plus size={16} /> Create Challenge
          </button>
        </div>
      )}

    </div>
  );
}
