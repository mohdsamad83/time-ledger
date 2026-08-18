"use client";
import { AppData, DayData, DaySetup, EveningReview, TimeBlock, DEFAULT_TARGETS } from "./types";

export async function fetchAppData(): Promise<AppData> {
  if (typeof window === "undefined") return { days: {}, version: "2.0", targets: DEFAULT_TARGETS };
  
  try {
    const res = await fetch("/api/sheets/data");
    const json = await res.json();
    if (json.ok && json.data) {
      if (!json.data.targets || json.data.targets.length === 0) {
        json.data.targets = [...DEFAULT_TARGETS];
      }
      return json.data;
    }
    return { days: {}, version: "2.0", targets: DEFAULT_TARGETS };
  } catch {
    return { days: {}, version: "2.0", targets: DEFAULT_TARGETS };
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
  if (!next.days[date]) next.days[date] = { date, setup: null, blocks: {}, eveningReview: null };
  next.days[date].blocks[block.startHour] = block;
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

export function applyTargetsUpdate(data: AppData, targets: string[]): AppData {
  const next = structuredClone(data);
  next.targets = targets;
  return next;
}

export function getAllDates(data: AppData | null): string[] {
  if (!data) return [];
  return Object.keys(data.days).sort().reverse();
}
