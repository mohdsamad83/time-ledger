"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Clock, BarChart2, History, CheckCircle,
  AlertCircle, Loader2, ExternalLink, BookOpen,
} from "lucide-react";

import {
  DaySetup, EveningReview, TimeBlock, AppData, SyncState,
} from "@/lib/types";
import {
  getDay, saveSetup, saveBlock, saveEvening,
  markSetupSynced, markBlockSynced, markEveningSynced,
  getAllDates, getRawData,
} from "@/lib/storage";

import MorningSetup    from "@/components/MorningSetup";
import TimelineView    from "@/components/TimelineView";
import BlockModal      from "@/components/BlockModal";
import EveningReviewModal from "@/components/EveningReview";
import InsightsView    from "@/components/InsightsView";
import HistoryView     from "@/components/HistoryView";
import ThemeToggle     from "@/components/ThemeToggle";

type Tab = "today" | "history" | "insights";

const TODAY = format(new Date(), "yyyy-MM-dd");
const DRUCKER_QUOTES = [
  "\"Time is the scarcest resource. Unless it is managed, nothing else can be managed.\"",
  "\"Efficiency is doing things right; effectiveness is doing the right things.\"",
  "\"What gets measured gets managed.\"",
  "\"Effective executives concentrate on the few major areas where superior performance will produce outstanding results.\"",
  "\"Until we can manage time, we can manage nothing else.\"",
  "\"The most important thing in communication is hearing what isn't said.\"",
];

export default function App() {
  const [tab,           setTab]           = useState<Tab>("today");
  const [viewDate,      setViewDate]      = useState(TODAY);
  const [dayData,       setDayData]       = useState(() => getDay(TODAY));
  const [appData,       setAppData]       = useState<AppData>({ days: {}, version: "1.0" });
  const [modalHour,     setModalHour]     = useState<number | null>(null);
  const [showEvening,   setShowEvening]   = useState(false);
  const [syncState,     setSyncState]     = useState<SyncState>("idle");
  const [syncMsg,       setSyncMsg]       = useState("");
  const [sheetsReady,   setSheetsReady]   = useState(false);
  const [quote]         = useState(() => DRUCKER_QUOTES[Math.floor(Math.random() * DRUCKER_QUOTES.length)]);
  const [mounted,       setMounted]       = useState(false);

  // ── Hydrate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setAppData(getRawData());
    setDayData(getDay(viewDate));
  }, [viewDate]);

  // ── Init Google Sheet (once per session) ──────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const key = "sheets-inited";
    if (sessionStorage.getItem(key)) { setSheetsReady(true); return; }
    fetch("/api/sheets/init", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setSheetsReady(true); sessionStorage.setItem(key, "1"); }
      })
      .catch(() => {}); // fails gracefully if no env vars
  }, [mounted]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refreshDay = useCallback(() => {
    setDayData(getDay(viewDate));
    setAppData(getRawData());
  }, [viewDate]);

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
      setSyncMsg("Sheets sync failed — data saved locally");
      setTimeout(() => setSyncState("idle"), 4000);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSetupComplete = async (setup: DaySetup) => {
    saveSetup(viewDate, setup);
    refreshDay();
    await syncToSheets(
      "/api/sheets/setup",
      { date: viewDate, setup },
      (ts) => { markSetupSynced(viewDate, ts); refreshDay(); }
    );
  };

  const handleBlockSave = async (block: TimeBlock) => {
    saveBlock(viewDate, block);
    setModalHour(null);
    refreshDay();
    await syncToSheets(
      "/api/sheets/log",
      { date: viewDate, block },
      (ts) => { markBlockSynced(viewDate, block.startHour, ts); refreshDay(); }
    );
  };

  const handleEveningSave = async (review: EveningReview) => {
    saveEvening(viewDate, review);
    setShowEvening(false);
    refreshDay();
    await syncToSheets(
      "/api/sheets/evening",
      { date: viewDate, review },
      (ts) => { markEveningSynced(viewDate, ts); refreshDay(); }
    );
  };

  if (!mounted) return null;

  const isToday = viewDate === TODAY;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top Nav ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
          >
            <Clock size={15} style={{ color: "var(--gold)" }} />
          </div>
          <div className="hidden sm:block">
            <span className="gold-text font-serif text-xl font-semibold tracking-wide">
              Time Ledger
            </span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {([
            { id: "today",    icon: <Clock size={14} />,    label: "Today" },
            { id: "history",  icon: <History size={14} />,  label: "History" },
            { id: "insights", icon: <BarChart2 size={14} />,label: "Insights" },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === "today") setViewDate(TODAY); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: tab === t.id ? "var(--surface)" : "transparent",
                border:     `1px solid ${tab === t.id ? "var(--border)" : "transparent"}`,
                color:      tab === t.id ? "var(--gold)" : "var(--faint)",
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
        </div>
      </header>

      {/* ── Date header (today view only) ──────────────────────────────────── */}
      {tab === "today" && dayData.setup && (
        <div
          className="px-4 md:px-6 py-3 flex items-center justify-between"
          style={{ background: "var(--bg)", borderBottom: "1px solid var(--s2)" }}
        >
          <div>
            <p className="font-mono text-xs" style={{ color: "var(--faint)" }}>
              {format(new Date(viewDate + "T12:00:00"), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <p className="text-xs italic hidden md:block font-serif max-w-sm text-right" style={{ color: "var(--faint)" }}>
            {quote}
          </p>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="flex-1 pt-6">

        {/* TODAY ─────────────────────────────────────────────────────────── */}
        {tab === "today" && (
          <>
            {!dayData.setup ? (
              <MorningSetup date={viewDate} onComplete={handleSetupComplete} />
            ) : (
              <TimelineView
                date={viewDate}
                setup={dayData.setup}
                blocks={dayData.blocks}
                syncState={syncState}
                onLogBlock={(hour) => setModalHour(hour)}
                onEveningReview={() => setShowEvening(true)}
                hasEveningReview={!!dayData.eveningReview}
              />
            )}
          </>
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
          <InsightsView data={appData} />
        )}
      </main>

      {/* ── Block Modal ────────────────────────────────────────────────────── */}
      {modalHour !== null && dayData.setup && (
        <BlockModal
          hour={modalHour}
          block={dayData.blocks[modalHour] ?? null}
          topPriority={dayData.setup.topPriority}
          onSave={handleBlockSave}
          onClose={() => setModalHour(null)}
        />
      )}

      {/* ── Evening Review Modal ───────────────────────────────────────────── */}
      {showEvening && dayData.setup && (
        <EveningReviewModal
          date={viewDate}
          setup={dayData.setup}
          blocks={dayData.blocks}
          review={dayData.eveningReview}
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
