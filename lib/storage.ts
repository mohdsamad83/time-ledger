"use client";
import { AppData, DayData, DaySetup, EveningReview, TimeBlock, DEFAULT_TARGETS } from "./types";

const KEY = "time-ledger-v1";

export function load(): AppData {
  if (typeof window === "undefined") return { days: {}, version: "1.0", targets: DEFAULT_TARGETS };
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : { days: {}, version: "1.0" };
    if (!data.targets) data.targets = [...DEFAULT_TARGETS];
    return data;
  } catch {
    return { days: {}, version: "1.0", targets: [...DEFAULT_TARGETS] };
  }
}

function persist(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

function ensureDay(data: AppData, date: string): DayData {
  if (!data.days[date]) {
    data.days[date] = { date, setup: null, blocks: {}, eveningReview: null };
  }
  return data.days[date];
}

export function getDay(date: string): DayData {
  const data = load();
  return data.days[date] ?? { date, setup: null, blocks: {}, eveningReview: null };
}

export function saveSetup(date: string, setup: DaySetup) {
  const data = load();
  ensureDay(data, date).setup = setup;
  persist(data);
}

export function saveBlock(date: string, block: TimeBlock) {
  const data = load();
  ensureDay(data, date).blocks[block.startHour] = block;
  persist(data);
}

export function saveEvening(date: string, review: EveningReview) {
  const data = load();
  ensureDay(data, date).eveningReview = review;
  persist(data);
}

export function markSetupSynced(date: string, ts: string) {
  const data = load();
  if (data.days[date]?.setup) data.days[date].setup!.syncedAt = ts;
  persist(data);
}

export function markBlockSynced(date: string, hour: number, ts: string) {
  const data = load();
  if (data.days[date]?.blocks[hour]) data.days[date].blocks[hour].syncedAt = ts;
  persist(data);
}

export function markEveningSynced(date: string, ts: string) {
  const data = load();
  if (data.days[date]?.eveningReview) data.days[date].eveningReview!.syncedAt = ts;
  persist(data);
}

export function toggleTaskCompleted(date: string, taskIndex: number) {
  const data = load();
  const day = data.days[date];
  if (day?.setup) {
    if (!day.setup.tasksCompleted) {
      day.setup.tasksCompleted = [false, false, false];
    }
    day.setup.tasksCompleted[taskIndex] = !day.setup.tasksCompleted[taskIndex];
    persist(data);
  }
}

export function toggleTarget(date: string, targetName: string) {
  const data = load();
  const day = ensureDay(data, date);
  if (!day.targets) day.targets = {};
  day.targets[targetName] = !day.targets[targetName];
  persist(data);
}

export function getAllDates(): string[] {
  return Object.keys(load().days).sort().reverse();
}

export function getRawData(): AppData {
  return load();
}

export function resetDay(date: string) {
  const data = load();
  if (data.days[date]) {
    delete data.days[date];
    persist(data);
  }
}
