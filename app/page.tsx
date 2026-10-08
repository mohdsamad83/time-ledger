"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isBefore, startOfMonth } from "date-fns";
import {
  Clock, BarChart2, History, CheckCircle,
  AlertCircle, Loader2, ExternalLink, BookOpen, RotateCcw, Timer, Target, LogOut, Settings, CalendarDays, Quote, Bot, GraduationCap
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  DaySetup, EveningReview, TimeBlock, AppData, SyncState, TargetMeta, RoutineItem
} from "@/lib/types";
import {
  fetchAppData, getDay, applySetup, applyBlock, applyEvening,
  applySetupSynced, applyBlockSynced, applyEveningSynced,
  applyTaskToggle, applyResetDay, applyTargetToggle,
  applyMonthlyTargetsUpdate
} from "@/lib/storage";
import { calculateCurrentMonthRank } from "@/lib/rank-utils";

import TimelineView    from "@/components/TimelineView";
import BlockModal      from "@/components/BlockModal";
import EveningReviewModal from "@/components/EveningReview";
import MorningSetup    from "@/components/MorningSetup";
import InsightsView    from "@/components/InsightsView";
import HistoryView     from "@/components/HistoryView";
import ThemeToggle     from "@/components/ThemeToggle";
import BreakReminder   from "@/components/BreakReminder";
import TargetsTracker  from "@/components/TargetsTracker";
import SettingsView    from "@/components/SettingsView";
import RoutineView     from "@/components/RoutineView";
import PlanTomorrowModal from "@/components/PlanTomorrowModal";
import ChallengesView  from "@/components/ChallengesView";
import AICoachView     from "@/components/AICoachView";
import AcademicsView   from "@/components/AcademicsView";
import { DEFAULT_CATEGORIES } from "@/lib/types";

type Tab = "today" | "targets" | "routine" | "challenges" | "academics" | "history" | "insights" | "settings" | "ai";

const TODAY = format(new Date(), "yyyy-MM-dd");

export default function App() {
  const [tab,           setTab]           = useState<Tab>("today");
  const [viewDate,      setViewDate]      = useState(TODAY);
  const [appData,       setAppData]       = useState<AppData | null>(null);
  const [modalHour,     setModalHour]     = useState<number | null>(null);
  const [showEvening,   setShowEvening]   = useState(false);
  const [showReminder,  setShowReminder]  = useState(false);
  const [showPlanTomorrow, setShowPlanTomorrow] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  const [syncState,     setSyncState]     = useState<SyncState>("idle");
  const [syncMsg,       setSyncMsg]       = useState("");
  const [sheetsReady,   setSheetsReady]   = useState(false);
  const [quote,         setQuote]         = useState("Loading mindset...");
  const [quoteAuthor,   setQuoteAuthor]   = useState("");
  const [mounted,       setMounted]       = useState(false);

  // ── Hydrate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    fetchAppData().then(data => setAppData(data));
    
    // Set a highly motivational daily quote
    const motivationalQuotes = [
      { q: "Time is the scarcest resource. Unless it is managed, nothing else can be managed.", a: "Peter F. Drucker" },
      { q: "Discipline equals freedom.", a: "Jocko Willink" },
      { q: "We must all suffer one of two things: the pain of discipline or the pain of regret.", a: "Jim Rohn" },
      { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
      { q: "The secret of your future is hidden in your daily routine.", a: "Mike Murdock" },
      { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
      { q: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", a: "Stephen King" },
      { q: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
      { q: "Don't count the days, make the days count.", a: "Muhammad Ali" },
      { q: "It is not that we have a short time to live, but that we waste a lot of it.", a: "Seneca" },
      { q: "The successful warrior is the average man, with laser-like focus.", a: "Bruce Lee" },
      { q: "Your future is created by what you do today, not tomorrow.", a: "Robert Kiyosaki" }
    ];
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(`"${randomQuote.q}"`);
    setQuoteAuthor(randomQuote.a);
  }, []);

  // ── Init Google Sheet (once per session) ──────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const key = "sheets-inited-v5";
    if (sessionStorage.getItem(key)) { setSheetsReady(true); return; }
    fetch("/api/sheets/init", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setSheetsReady(true); sessionStorage.setItem(key, "1"); }
      })
      .catch(() => {}); // fails gracefully if no env vars
  }, [mounted]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const syncToSheets = useCallback(async (
    endpoint: string,
    payload: object,
    onSynced: (ts: string) => void,
  ) => {
    try {
      setSyncState("syncing");
      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setSyncState("ok");
        setSyncMsg(`Synced to Sheets ${new Date(data.syncedAt).toLocaleTimeString()}`);
        onSynced(data.syncedAt);
        setTimeout(() => setSyncState("idle"), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setSyncState("error");
      setSyncMsg("Sheets sync failed — try again later");
      setTimeout(() => setSyncState("idle"), 4000);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSetupComplete = async (setup: DaySetup) => {
    if (!appData) return;
    setAppData(prev => prev ? applySetup(prev, viewDate, setup) : prev);
    await syncToSheets(
      "/api/sheets/setup",
      { date: viewDate, setup },
      (ts) => setAppData(prev => prev ? applySetupSynced(prev, viewDate, ts) : prev)
    );
  };

  const handleBlockSave = async (block: TimeBlock) => {
    if (!appData) return;
    const nextAppData = applyBlock(appData, viewDate, block);
    setAppData(nextAppData);
    setModalHour(null);
    
    await syncToSheets(
      "/api/sheets/log",
      { date: viewDate, block },
      (ts) => setAppData(prev => prev ? applyBlockSynced(prev, viewDate, block.startHour, ts) : prev)
    );

    if (block.contributedPriority && block.contributedPriority !== "None") {
      const updatedTargetsObj = nextAppData.days[viewDate]?.targets || {};
      const completedTargetsList = Object.entries(updatedTargetsObj)
        .filter(([_, isCompleted]) => isCompleted)
        .map(([name]) => name);

      await syncToSheets(
        "/api/sheets/daily-targets",
        { date: viewDate, targets: completedTargetsList },
        () => {}
      );
    }
  };

  const handleEveningSave = async (review: EveningReview) => {
    if (!appData) return;
    setAppData(prev => prev ? applyEvening(prev, viewDate, review) : prev);
    setShowEvening(false);
    await syncToSheets(
      "/api/sheets/evening",
      { date: viewDate, review },
      (ts) => setAppData(prev => prev ? applyEveningSynced(prev, viewDate, ts) : prev)
    );
  };

  const handleToggleTask = (taskIndex: number) => {
    if (!appData) return;
    setAppData(prev => prev ? applyTaskToggle(prev, viewDate, taskIndex) : prev);
  };

  const handleToggleTarget = async (targetDate: string, targetName: string) => {
    if (!appData) return;
    const nextAppData = applyTargetToggle(appData, targetDate, targetName);
    setAppData(nextAppData);

    const updatedTargetsObj = nextAppData.days[targetDate]?.targets || {};
    const completedTargetsList = Object.entries(updatedTargetsObj)
      .filter(([_, isCompleted]) => isCompleted)
      .map(([name]) => name);

    await syncToSheets(
      "/api/sheets/daily-targets",
      { date: targetDate, targets: completedTargetsList },
      () => {}
    );
  };

  const handleUpdateCommitments = async (commitments: [string, string, string]) => {
    if (!appData) return;
    const day = getDay(appData, viewDate);
    if (!day.setup) return;
    
    const newSetup = { ...day.setup, tasks: commitments };
    if (newSetup.plannedInAdvance) {
      newSetup.tasksEdits = (newSetup.tasksEdits || 0) + 1;
    }
    
    setAppData(prev => prev ? applySetup(prev, viewDate, newSetup) : prev);
    
    await syncToSheets(
      "/api/sheets/setup",
      { date: viewDate, setup: newSetup },
      () => {}
    );
  };

  const handleExtendDay = async () => {
    if (!appData) return;
    const day = getDay(appData, viewDate);
    if (!day.setup) return;
    
    // Add 1 hour to sleepHour, wrap around at 24
    const newSleepHour = (day.setup.sleepHour + 1) % 24;
    const newSetup = { ...day.setup, sleepHour: newSleepHour };
    
    setAppData(prev => prev ? applySetup(prev, viewDate, newSetup) : prev);
    
    await syncToSheets(
      "/api/sheets/setup",
      { date: viewDate, setup: newSetup },
      () => {}
    );
  };

  const handleUpdateTargets = async (monthlyTargets: Record<string, TargetMeta[]>) => {
    if (!appData) return;
    setAppData(prev => prev ? applyMonthlyTargetsUpdate(prev, monthlyTargets) : prev);
    await syncToSheets(
      "/api/sheets/targets",
      { monthlyTargets },
      () => {}
    );
  };
  const handleSaveRoutine = async (routine: RoutineItem[]) => {
    if (!appData) return;
    setAppData(prev => prev ? { ...prev, routine } : prev);
    await syncToSheets(
      "/api/sheets/routine",
      { routine },
      () => {}
    );
  };

  const handlePlanTomorrow = async (commitments: [string, string, string]) => {
    if (!appData) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

    // Initialize or update tomorrow's setup
    const day = getDay(appData, tomorrowStr);
    const existingSetup = day.setup || {
      wakeHour: 6,
      sleepHour: 22,
      topPriority: "",
      tasks: commitments,
      tasksCompleted: [false, false, false],
      successDefinition: "",
      druckerFocus: "",
      syncedAt: null
    };

    const newSetup: DaySetup = {
      ...existingSetup,
      tasks: commitments,
      plannedInAdvance: true,
      tasksEdits: 0
    };

    setAppData(prev => prev ? applySetup(prev, tomorrowStr, newSetup) : prev);
    await syncToSheets(
      "/api/sheets/setup",
      { date: tomorrowStr, setup: newSetup },
      () => {}
    );
  };

  if (!mounted) return null;

  if (!appData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[var(--faint)]">
          <Loader2 className="spin-slow" size={32} />
          <p className="text-sm uppercase tracking-widest font-bold">Syncing from Sheets...</p>
        </div>
      </div>
    );
  }

  const dayData = getDay(appData, viewDate);
  const isToday = viewDate === TODAY;
  const activeCategories = appData.categories || DEFAULT_CATEGORIES;

  // Monthly targets for active view
  const currentMonthStr = viewDate.substring(0, 7);
  let currentTargets: string[] = [];
  
  if (appData.monthlyTargets) {
    const targetMap = new Map<string, boolean>();
    const viewedMonthStart = startOfMonth(new Date(viewDate));

    Object.keys(appData.monthlyTargets).sort().forEach(m => {
      if (m <= currentMonthStr) {
        for (const t of appData.monthlyTargets![m]) {
          if (t.accomplishedAt === "dropped") {
            targetMap.delete(t.name);
            continue;
          }
          if (t.accomplishedAt) {
            const accDate = new Date(t.accomplishedAt);
            if (isBefore(accDate, viewedMonthStart)) continue;
          }
          targetMap.set(t.name, true);
        }
      }
    });
    currentTargets = Array.from(targetMap.keys());
  } else if (appData.targets && appData.targets.length > 0) {
    currentTargets = appData.targets;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* ── Top Nav ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid var(--dim)" }}>
            <Image src="/logo.jpg" alt="Logo" width={32} height={32} />
          </div>
          <div className="hidden sm:block">
            <span className="primary-text font-bold text-xl tracking-tight">
              Time Ledger
            </span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {([
            { id: "today",    icon: <Clock size={14} />,    label: "Today" },
            { id: "targets",  icon: <Target size={14} />,   label: "Targets" },
            { id: "routine",  icon: <CalendarDays size={14} />, label: "Routine" },
            { id: "challenges", icon: <Target size={14} />, label: "Challenges" },
            { id: "academics", icon: <GraduationCap size={14} />, label: "Academics" },
            { id: "history",  icon: <History size={14} />,  label: "History" },
            { id: "insights", icon: <BarChart2 size={14} />,label: "Insights" },
            { id: "ai",       icon: <Bot size={14} />,      label: "AI Coach" },
            { id: "settings", icon: <Settings size={14} />, label: "Settings" },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === "today") setViewDate(TODAY); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: tab === t.id ? "var(--surface)" : "transparent",
                border:     `1px solid ${tab === t.id ? "var(--border)" : "transparent"}`,
                color:      tab === t.id ? "var(--primary)" : "var(--faint)",
              }}
            >
              {t.icon}
              <span className="hidden sm:inline font-medium">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Sync status + Theme toggle */}
        <div className="flex items-center gap-2">
          <SyncIndicator state={syncState} msg={syncMsg} />
          <button
            onClick={() => setShowReminder(!showReminder)}
            className="flex items-center gap-1 btn-ghost text-xs px-2 py-1"
            title="Break Timer"
          >
            <Timer size={12} />
            <span className="hidden sm:inline">Timer</span>
          </button>
          {process.env.NEXT_PUBLIC_SHEET_URL && (
            <a
              href={process.env.NEXT_PUBLIC_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 btn-ghost text-xs px-2 py-1"
              title="Open Google Sheet"
            >
              <ExternalLink size={12} />
              <span className="hidden sm:inline">Sheets</span>
            </a>
          )}
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 btn-ghost text-xs px-2 py-1 ml-1 text-red-400 hover:text-red-500 hover:bg-red-500/10"
            title="Log Out"
          >
            <LogOut size={12} />
          </button>
        </div>
      </header>

      {/* ── Date header (today view only) ──────────────────────────────────── */}
      {tab === "today" && dayData.setup && (
        <div
          className="px-4 md:px-6 py-3 flex items-center justify-between gap-6"
          style={{ background: "var(--bg)", borderBottom: "1px solid var(--s2)" }}
        >
          <div className="flex items-center gap-3 shrink-0">
            <p className="font-mono text-xs" style={{ color: "var(--faint)" }}>
              {format(new Date(viewDate + "T12:00:00"), "EEEE, MMMM d, yyyy")}
            </p>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to completely reset this day? This will delete your setup, logs, and evening review locally.")) {
                  setAppData(prev => prev ? applyResetDay(prev, viewDate) : prev);
                }
              }}
              className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
              style={{ background: "var(--s2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              title="Start day over"
            >
              <RotateCcw size={10} /> Reset
            </button>
            <button
              onClick={() => setShowPlanTomorrow(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase transition-colors"
              style={{ color: "var(--primary)", border: "1px solid var(--primary)", background: "rgba(var(--primary-rgb), 0.1)" }}
            >
              Plan Tomorrow
            </button>
          </div>

          {quote && (
            <div className="hidden lg:flex flex-1 items-center justify-end opacity-80 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-2 max-w-[800px]">
                 <Quote size={12} style={{ color: "var(--primary)" }} className="shrink-0" />
                 <p className="text-sm italic truncate" style={{ color: "var(--text)" }}>
                   {quote}
                 </p>
                 {quoteAuthor && (
                   <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>
                     — {quoteAuthor}
                   </span>
                 )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="flex-1 pt-6">

        {/* TODAY ─────────────────────────────────────────────────────────── */}
        {tab === "today" && (
          <>
            {!dayData.setup ? (
              <MorningSetup 
                date={viewDate} 
                targets={currentTargets}
                routine={appData.routine || []}
                onComplete={handleSetupComplete} 
              />
            ) : (
              <TimelineView
                date={viewDate}
                setup={dayData.setup}
                blocks={dayData.blocks}
                routine={appData.routine || []}
                dayTargets={dayData.targets || {}}
                allTargets={currentTargets}
                categories={activeCategories}
                syncState={syncState}
                onLogBlock={(hour) => setModalHour(hour)}
                onEveningReview={() => setShowEvening(true)}
                hasEveningReview={!!dayData.eveningReview}
                onToggleTarget={(targetName) => handleToggleTarget(viewDate, targetName)}
                onUpdateCommitments={handleUpdateCommitments}
                onExtendDay={handleExtendDay}
                activeChallenge={appData.challenges?.find(c => c.status === "active")}
                targetRank={calculateCurrentMonthRank(appData)}
              />
            )}
          </>
        )}

        {/* TARGETS ───────────────────────────────────────────────────────── */}
        {tab === "targets" && (
          <div className="px-4 pb-16">
            <TargetsTracker 
              data={appData}
              onToggle={handleToggleTarget}
              onUpdateTargets={handleUpdateTargets}
            />
          </div>
        )}

        {/* HISTORY ────────────────────────────────────────────────────────── */}
        {tab === "history" && (
          <HistoryView
            data={appData}
            onSelectDate={(date) => {
              setViewDate(date);
              setTab("today");
            }}
          />
        )}

        {/* INSIGHTS ───────────────────────────────────────────────────────── */}
        {tab === "insights" && (
          <InsightsView data={appData} categories={activeCategories} />
        )}

        {/* ROUTINE ────────────────────────────────────────────────────────── */}
        {tab === "routine" && (
          <RoutineView routine={appData.routine || []} onSave={handleSaveRoutine} />
        )}

        {/* CHALLENGES ─────────────────────────────────────────────────────── */}
        {tab === "challenges" && (
          <ChallengesView 
            challenges={appData.challenges || []}
            allTargets={currentTargets}
            dayTargets={dayData.targets || {}}
            allDays={appData.days}
            onUpdate={async (newChallenges) => {
              setAppData(prev => prev ? { ...prev, challenges: newChallenges } : prev);
              await syncToSheets("/api/sheets/challenges", { challenges: newChallenges }, () => {});
            }}
          />
        )}

        {/* ACADEMICS ──────────────────────────────────────────────────────── */}
        {tab === "academics" && (
          <AcademicsView
            data={appData}
            onUpdate={async (newAcademics) => {
              setAppData(prev => prev ? { ...prev, academics: newAcademics } : prev);
              await syncToSheets("/api/sheets/academics", { academics: newAcademics }, () => {}); 
            }}
          />
        )}

        {/* SETTINGS ───────────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <SettingsView
            initialCategories={activeCategories}
            onUpdate={(newCategories) => {
              setAppData(prev => prev ? { ...prev, categories: newCategories } : prev);
            }}
          />
        )}

        {/* AI COACH ───────────────────────────────────────────────────────── */}
        {tab === "ai" && (
          <AICoachView data={appData} />
        )}
      </main>

      {/* ── Block Modal ────────────────────────────────────────────────────── */}
      {modalHour !== null && dayData.setup && (
        <BlockModal
          hour={modalHour}
          block={dayData.blocks[modalHour] ?? null}
          targets={currentTargets}
          categories={activeCategories}
          onSave={handleBlockSave}
          onClose={() => setModalHour(null)}
        />
      )}

      {showEvening && dayData.setup && (
        <EveningReviewModal
          date={viewDate}
          setup={dayData.setup}
          blocks={dayData.blocks}
          review={dayData.eveningReview}
          dayTargets={dayData.targets || {}}
          onSave={handleEveningSave}
          onClose={() => setShowEvening(false)}
        />
      )}

      {/* ── Drucker footer (desktop) ─────────────────────────────────────── */}
      <footer
        className="hidden md:flex items-center justify-center py-3 px-6 gap-2"
        style={{ borderTop: "1px solid var(--s2)" }}
      >
        <BookOpen size={11} style={{ color: "var(--border)" }} />
        <p className="text-xs font-serif italic" style={{ color: "var(--border)" }}>
          Based on the principles of The Effective Executive · Peter F. Drucker
        </p>
      </footer>
      {/* ── Break Reminder Widget ─────────────────────────────────────────── */}
      {showReminder && <BreakReminder onClose={() => setShowReminder(false)} />}
      
      {showPlanTomorrow && (
        <PlanTomorrowModal
          onClose={() => setShowPlanTomorrow(false)}
          onSave={handlePlanTomorrow}
          targets={currentTargets}
        />
      )}
    </div>
  );
}

// ── Sync Indicator ──────────────────────────────────────────────────────────
function SyncIndicator({ state, msg }: { state: SyncState; msg: string }) {
  if (state === "idle") return null;
  const configs = {
    syncing: { icon: <Loader2 size={12} className="spin-slow" />, color: "#FCD34D", text: "Syncing…" },
    ok:      { icon: <CheckCircle size={12} />, color: "#4ADE80", text: "Synced" },
    error:   { icon: <AlertCircle size={12} />, color: "#F87171", text: "Sync error" },
  };
  const cfg = configs[state as keyof typeof configs];
  if (!cfg) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
      style={{ color: cfg.color }}
      title={msg}
    >
      {cfg.icon}
      <span className="hidden sm:inline">{cfg.text}</span>
    </div>
  );
}
