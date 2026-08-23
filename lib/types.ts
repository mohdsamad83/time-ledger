export type Category =
  | "sleep"
  | "routine"
  | "working"
  | "coding"
  | "learning"
  | "eating"
  | "family"
  | "friends"
  | "entertainment"
  | "roaming"
  | "wasting"
  | "social-media"
  | string; // allow legacy strings from old saves

export interface CustomCategory {
  value: string;
  label: string;
  color: string;
  bg: string;
  emoji: string;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { value: "sleep",        label: "Sleep",           color: "#818CF8", bg: "rgba(129, 140, 248, 0.1)", emoji: "💤" },
  { value: "routine",      label: "Woke up/Routine", color: "#FCD34D", bg: "rgba(252, 211, 77, 0.1)",  emoji: "🌅" },
  { value: "working",      label: "Working",         color: "#60A5FA", bg: "rgba(96, 165, 250, 0.1)",  emoji: "💼" },
  { value: "coding",       label: "Coding",          color: "#34D399", bg: "rgba(52, 211, 153, 0.1)",  emoji: "💻" },
  { value: "learning",     label: "Learning",        color: "#A78BFA", bg: "rgba(167, 139, 250, 0.1)", emoji: "📚" },
  { value: "eating",       label: "Eating",          color: "#F472B6", bg: "rgba(244, 114, 182, 0.1)", emoji: "🍽️" },
  { value: "family",       label: "Family Time",     color: "#FB923C", bg: "rgba(251, 146, 60, 0.1)",  emoji: "❤️" },
  { value: "friends",      label: "Friends Time",    color: "#FBBF24", bg: "rgba(251, 191, 36, 0.1)",  emoji: "🍻" },
  { value: "entertainment",label: "Entertainment",   color: "#C084FC", bg: "rgba(192, 132, 252, 0.1)", emoji: "🍿" },
  { value: "roaming",      label: "Roaming",         color: "#9CA3AF", bg: "rgba(156, 163, 175, 0.1)", emoji: "🚶" },
  { value: "wasting",      label: "Wasting Time",    color: "#F87171", bg: "rgba(248, 113, 113, 0.1)", emoji: "🫠" },
  { value: "social-media", label: "Social Media",    color: "#38BDF8", bg: "rgba(56, 189, 248, 0.1)",  emoji: "📱" },
];

// ─── Core models ─────────────────────────────────────────────────────────────
export type EnergyLevel   = "high" | "medium" | "low";
export type DelegateOpt   = "yes" | "no" | "na";
export type PriorityTag   = string;

export interface TimeBlock {
  id:                      string;
  startHour:               number;          // 0–23
  activity:                string;
  category?:               Category;        // [DEPRECATED] Legacy
  categories:              string[];        // Array of category values
  energy:                  EnergyLevel;
  wasPlanned:              boolean;
  contributedToTopPriority: boolean; // [DEPRECATED] 
  contributedPriority?:    PriorityTag; // [DEPRECATED]
  contributedTargets?:     { name: string; percentage: number }[];
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

export interface TargetMeta {
  name: string;
  accomplishedAt?: string | null; // "YYYY-MM-DD"
}

export interface AppData {
  days:    { [date: string]: DayData };
  targets?: string[];                       // [DEPRECATED] Legacy global list
  monthlyTargets?: Record<string, TargetMeta[]>; // Keyed by month "YYYY-MM"
  categories?: CustomCategory[];            // Custom dynamic categories
  version: string;
}

// ─── Sync status ─────────────────────────────────────────────────────────────
export type SyncState = "idle" | "syncing" | "ok" | "error";
