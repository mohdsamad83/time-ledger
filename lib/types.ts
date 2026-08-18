// ─── Category ────────────────────────────────────────────────────────────────
export type Category =
  | "deep-work"
  | "meetings"
  | "admin"
  | "learning"
  | "health"
  | "personal"
  | "creative"
  | "strategic"
  | "firefighting"
  | "break";

export const CATEGORIES: {
  value: Category;
  label: string;
  color: string;
  bg: string;
  emoji: string;
}[] = [
  { value: "deep-work",    label: "Deep Work",         color: "#60A5FA", bg: "#1e3a5f", emoji: "🎯" },
  { value: "meetings",     label: "Meetings & Calls",  color: "#A78BFA", bg: "#2d1f5e", emoji: "🤝" },
  { value: "admin",        label: "Email & Admin",     color: "#FCD34D", bg: "#4a3800", emoji: "📋" },
  { value: "learning",     label: "Learning",          color: "#34D399", bg: "#063e2b", emoji: "📚" },
  { value: "health",       label: "Health & Exercise", color: "#4ADE80", bg: "#063b14", emoji: "💪" },
  { value: "personal",     label: "Personal & Family", color: "#F472B6", bg: "#4a0d2b", emoji: "❤️" },
  { value: "creative",     label: "Creative Work",     color: "#FB923C", bg: "#4a1d00", emoji: "✨" },
  { value: "strategic",    label: "Strategic Planning",color: "#818CF8", bg: "#1e1f5e", emoji: "🗺️" },
  { value: "firefighting", label: "Fire-fighting",     color: "#F87171", bg: "#4a0d0d", emoji: "🚒" },
  { value: "break",        label: "Break & Rest",      color: "#9CA3AF", bg: "#1f2937", emoji: "☕" },
];

// ─── Core models ─────────────────────────────────────────────────────────────
export type EnergyLevel   = "high" | "medium" | "low";
export type DelegateOpt   = "yes" | "no" | "na";
export type PriorityTag   = string;

export interface TimeBlock {
  id:                      string;
  startHour:               number;          // 0–23
  activity:                string;
  category:                Category;
  energy:                  EnergyLevel;
  wasPlanned:              boolean;
  contributedToTopPriority: boolean; // deprecated, use contributedPriority
  contributedPriority?:    PriorityTag;
  couldDelegate:           DelegateOpt;
  satisfaction:            number;          // 1–5
  contribution:            string;          // Drucker Q: "What did I contribute?"
  notes:                   string;
  syncedAt?:               string | null;
}

export interface DaySetup {
  wakeHour:          number;
  sleepHour:         number;
  topPriority:       string;
  tasks:             [string, string, string];
  tasksCompleted:    [boolean, boolean, boolean];  // Track commitment completion
  successDefinition: string;
  druckerFocus:      string;   // "What needs to be done today?"
  syncedAt?:         string | null;
}

export interface EveningReview {
  topPriorityAccomplished: boolean;
  accomplishments:         string;
  biggestWaste:            string;
  stopDoing:               string;
  keepDoing:               string;
  tomorrowPriority:        string;
  overallRating:           number;          // 1–10
  energyEnd:               "energized" | "neutral" | "drained";
  druckerContribution:     string;
  syncedAt?:               string | null;
}

export interface DayData {
  date:          string;                    // YYYY-MM-DD
  setup:         DaySetup | null;
  blocks:        { [hour: number]: TimeBlock };
  eveningReview: EveningReview | null;
  targets?:      Record<string, boolean>;   // Tracks which targets were completed on this day
}

export const DEFAULT_TARGETS = [
  "Workout", "MLP", "DLGenAI", "FlyRank AI", "Part time", 
  "Mad - I Project", "Amazon Certification", "Google Arcade", "Gate prep"
];

export interface AppData {
  days:    { [date: string]: DayData };
  targets?: string[];                       // Global list of targets to track
  version: string;
}

// ─── Sync status ─────────────────────────────────────────────────────────────
export type SyncState = "idle" | "syncing" | "ok" | "error";
