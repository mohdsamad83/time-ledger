"use client";
import { AppData, DayData, DaySetup, EveningReview, TimeBlock, DEFAULT_TARGETS, DEFAULT_CATEGORIES, CustomCategory } from "./types";

export async function fetchAppData(): Promise<AppData> {
  if (typeof window === "undefined") return { days: {}, version: "2.0", targets: DEFAULT_TARGETS, categories: DEFAULT_CATEGORIES, monthlyTargets: {} };
  
  try {
    const res = await fetch("/api/sheets/data");
    const json = await res.json();
    if (json.ok && json.data) {
      if (!json.data.targets || json.data.targets.length === 0) {
        json.data.targets = [...DEFAULT_TARGETS];
      }
      if (!json.data.categories || json.data.categories.length === 0) {
        json.data.categories = [...DEFAULT_CATEGORIES];
      }
      if (!json.data.monthlyTargets) {
        json.data.monthlyTargets = {};
      }
      return json.data;
    }
    return { days: {}, version: "2.0", targets: DEFAULT_TARGETS, categories: DEFAULT_CATEGORIES, monthlyTargets: {} };
  } catch {
    return { days: {}, version: "2.0", targets: DEFAULT_TARGETS, categories: DEFAULT_CATEGORIES, monthlyTargets: {} };
  }
}

export function getDay(appData: AppData | null, date: string): DayData {
  if (!appData) return { date, setup: null, blocks: {}, eveningReview: null };
  return appData.days[date] ?? { date, setup: null, blocks: {}, eveningReview: null };
}

// Pure functions to update state immutably

export function applySetup(data: AppData, date: string, setup: DaySetup): AppData {
  const next = structuredClone(data);
  if (!next.days[date]) next.days[date] = { date, setup: null, blocks: {}, eveningReview: null };
  next.days[date].setup = setup;
  return next;
}

export function applyBlock(data: AppData, date: string, block: TimeBlock): AppData {
  const next = structuredClone(data);
  if (!next.days[date]) next.days[date] = { date, setup: null, blocks: {}, eveningReview: null, targets: {} };
  next.days[date].blocks[block.startHour] = block;

  if (!next.days[date].targets) next.days[date].targets = {};
  
  const targetProgress: Record<string, number> = {};
  Object.values(next.days[date].blocks).forEach(b => {
    b.contributedTargets?.forEach(t => {
      targetProgress[t.name] = (targetProgress[t.name] || 0) + t.percentage;
    });
  });

  Object.entries(targetProgress).forEach(([tName, pct]) => {
    next.days[date].targets![tName] = pct >= 100;
  });
  return next;
}

export function applyEvening(data: AppData, date: string, review: EveningReview): AppData {
  const next = structuredClone(data);
  if (!next.days[date]) next.days[date] = { date, setup: null, blocks: {}, eveningReview: null };
  next.days[date].eveningReview = review;
  return next;
}

export function applySetupSynced(data: AppData, date: string, ts: string): AppData {
  const next = structuredClone(data);
  if (next.days[date]?.setup) next.days[date].setup!.syncedAt = ts;
  return next;
}

export function applyBlockSynced(data: AppData, date: string, hour: number, ts: string): AppData {
  const next = structuredClone(data);
  if (next.days[date]?.blocks[hour]) next.days[date].blocks[hour].syncedAt = ts;
  return next;
}

export function applyEveningSynced(data: AppData, date: string, ts: string): AppData {
  const next = structuredClone(data);
  if (next.days[date]?.eveningReview) next.days[date].eveningReview!.syncedAt = ts;
  return next;
}

export function applyTaskToggle(data: AppData, date: string, taskIndex: number): AppData {
  const next = structuredClone(data);
  const day = next.days[date];
  if (day?.setup) {
    if (!day.setup.tasksCompleted) {
      day.setup.tasksCompleted = [false, false, false];
    }
    day.setup.tasksCompleted[taskIndex] = !day.setup.tasksCompleted[taskIndex];
  }
  return next;
}

export function applyTargetToggle(data: AppData, date: string, targetName: string): AppData {
  const next = structuredClone(data);
  if (!next.days[date]) {
    next.days[date] = { date, setup: null, blocks: {}, eveningReview: null, targets: {} };
  }
  const day = next.days[date];
  if (!day.targets) day.targets = {};
  day.targets[targetName] = !day.targets[targetName];
  return next;
}

export function applyResetDay(data: AppData, date: string): AppData {
  const next = structuredClone(data);
  if (next.days[date]) {
    delete next.days[date];
  }
  return next;
}

import { TargetMeta } from "./types";

export function applyMonthlyTargetsUpdate(data: AppData, monthlyTargets: Record<string, TargetMeta[]>): AppData {
  const next = structuredClone(data);
  next.monthlyTargets = monthlyTargets;
  return next;
}

export function getAllDates(data: AppData | null): string[] {
  if (!data) return [];
  return Object.keys(data.days).sort().reverse();
}

export async function saveCategories(categories: CustomCategory[]): Promise<boolean> {
  try {
    const res = await fetch("/api/sheets/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to sync categories:", err);
    return false;
  }
}
