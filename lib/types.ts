// ─── Category ────────────────────────────────────────────────────────────────
export type Category =
  | "deep-work"
  | "shallow-work"
  | "collaboration"
  | "growth"
  | "recharge"
  | string; // allow legacy strings from old saves

export const CATEGORIES: {
  value: Category;
  label: string;
  color: string;
  bg: string;
  emoji: string;
}[] = [
  { value: "deep-work",    label: "Deep Work",         color: "#60A5FA", bg: "rgba(96, 165, 250, 0.1)", emoji: "🎯" },
  { value: "shallow-work", label: "Shallow & Admin",   color: "#FCD34D", bg: "rgba(252, 211, 77, 0.1)", emoji: "⚡" },
  { value: "collaboration",label: "Collaboration",     color: "#A78BFA", bg: "rgba(167, 139, 250, 0.1)",emoji: "🤝" },
  { value: "growth",       label: "Learning & Growth", color: "#34D399", bg: "rgba(52, 211, 153, 0.1)", emoji: "🌱" },
  { value: "recharge",     label: "Life & Recharge",   color: "#F472B6", bg: "rgba(244, 114, 182, 0.1)", emoji: "🔋" },
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
