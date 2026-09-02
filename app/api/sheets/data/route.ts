import { NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";
import { AppData, DayData, TimeBlock, DaySetup, EveningReview, Category, DEFAULT_CATEGORIES, EnergyLevel, DelegateOpt } from "@/lib/types";

// Helper to parse "AM/PM" string into a 24-hour integer
function parseTimeStr(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.match(/(\d+):00\s+(AM|PM)/i);
  if (!parts) return 0;
  let hr = parseInt(parts[1], 10);
  const period = parts[2].toUpperCase();
  if (period === "PM" && hr !== 12) hr += 12;
  if (period === "AM" && hr === 12) hr = 0;
  return hr;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    const [logRes, setupRes, eveningRes, targetsRes, dailyTargetsRes, categoriesRes, routineRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "📅 Time Log!A2:N" }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "🌅 Day Setup!A2:K" }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "🌙 Evening Reviews!A2:L" }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "🎯 Targets!A2:D" }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "✅ Daily Targets!A2:C" }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "🏷️ Categories!A2:E" }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "⏱️ Routine!A2:C" }).catch(() => ({ data: { values: [] } })),
    ]);

    const logRows = logRes.data.values ?? [];
    const setupRows = setupRes.data.values ?? [];
    const eveningRows = eveningRes.data.values ?? [];
    const targetRows = targetsRes.data.values ?? [];
    const dailyTargetRows = dailyTargetsRes.data.values ?? [];
    const categoryRows = categoriesRes.data.values ?? [];
    const routineRows = routineRes?.data?.values ?? [];

    const appData: AppData = { days: {}, version: "2.0", targets: [], categories: [], routine: [] };

    // 0. Parse Routine
    if (routineRows.length > 0) {
      appData.routine = routineRows.map((r: any) => ({
        activity: r[0] || "",
        startTime: r[1] || "",
        endTime: r[2] || "",
      })).filter((c: any) => c.activity);
    }

    // 0. Parse Categories
    if (categoryRows.length > 0) {
      appData.categories = categoryRows.map(r => ({
        value: r[0] || "",
        label: r[1] || "",
        color: r[2] || "",
        bg: r[3] || "",
        emoji: r[4] || "",
      })).filter(c => c.value);
    }
    appData.monthlyTargets = {};
    
    targetRows.forEach(r => {
      // Check if row[0] is a Month (YYYY-MM)
      if (r[0] && /^\d{4}-\d{2}$/.test(r[0])) {
        const month = r[0];
        const name = r[1];
        const accomplishedAt = r[2] || null;
        if (!appData.monthlyTargets![month]) appData.monthlyTargets![month] = [];
        if (name) appData.monthlyTargets![month].push({ name, accomplishedAt });
      } else if (r[0]) {
        // Legacy target
        appData.targets!.push(r[0]);
      }
    });

    // 1.5 Parse Daily Target Toggles
    for (const row of dailyTargetRows) {
      const date = row[0];
      const completedStr = row[1] ?? "";
      if (!date) continue;
      if (!appData.days[date]) appData.days[date] = { date, setup: null, blocks: {}, eveningReview: null, targets: {} };
      
      const completedList = completedStr.split(",").map((s: string) => s.trim()).filter(Boolean);
      appData.days[date].targets = {};
      completedList.forEach((t: string) => {
        appData.days[date].targets![t] = true;
      });
    }

    // 2. Parse Day Setup
    for (const row of setupRows) {
      const date = row[0];
      if (!date) continue;
      if (!appData.days[date]) appData.days[date] = { date, setup: null, blocks: {}, eveningReview: null };
      
      const setup: DaySetup = {
        wakeHour: parseTimeStr(row[2]),
        sleepHour: parseTimeStr(row[3]),
        topPriority: row[4] ?? "",
        tasks: [row[5] ?? "", row[6] ?? "", row[7] ?? ""],
        tasksCompleted: [false, false, false], // State lost in sheets, default to false
        successDefinition: row[8] ?? "",
        druckerFocus: row[9] ?? "",
        syncedAt: row[10] ?? null,
      };
      appData.days[date].setup = setup;
    }

    // 3. Parse Evening Reviews
    for (const row of eveningRows) {
      const date = row[0];
      if (!date) continue;
      if (!appData.days[date]) appData.days[date] = { date, setup: null, blocks: {}, eveningReview: null };

      const review: EveningReview = {
        topPriorityAccomplished: (row[2] ?? "").includes("Yes"),
        accomplishments: row[3] ?? "",
        biggestWaste: row[4] ?? "",
        stopDoing: row[5] ?? "",
        keepDoing: row[6] ?? "",
        tomorrowPriority: row[7] ?? "",
        overallRating: parseInt(row[8] ?? "5", 10),
        energyEnd: (row[9] as "energized" | "neutral" | "drained") ?? "neutral",
        druckerContribution: row[10] ?? "",
        syncedAt: row[11] ?? null,
      };
      appData.days[date].eveningReview = review;
    }

    // 4. Parse Time Logs
    for (const row of logRows) {
      const date = row[0];
      if (!date) continue;
      if (!appData.days[date]) appData.days[date] = { date, setup: null, blocks: {}, eveningReview: null };

      const startHour = parseInt(row[2] ?? "0", 10);
      const catRaw = row[5] || "";
      const categories: string[] = [];
      const parts = catRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
      for (const part of parts) {
        // Try to match as a label first (legacy fallback)
        const legacyMatch = DEFAULT_CATEGORIES.find(c => c.label === part);
        if (legacyMatch) {
          categories.push(legacyMatch.value);
        } else {
          // Assume it's a value
          categories.push(part);
        }
      }
      if (categories.length === 0) categories.push("deep-work");
      
      const priorityVal = row[8] || "";
      let contributedPriority = priorityVal;
      let contributedToTopPriority = false;
      const contributedTargets: { name: string; percentage: number }[] = [];

      if (priorityVal === "No" || !priorityVal) {
        contributedPriority = "None";
      } else if (priorityVal === "P1") {
        contributedToTopPriority = true;
      } else {
        // Parse "TargetName: 20%, OtherTarget: 50%" or legacy "TargetName"
        const tParts = priorityVal.split(",");
        for (const pt of tParts) {
           const [name, pctStr] = pt.split(":");
           if (name && pctStr) {
             contributedTargets.push({ name: name.trim(), percentage: parseInt(pctStr, 10) || 100 });
           } else if (name) {
             contributedTargets.push({ name: name.trim(), percentage: 100 });
           }
        }
      }

      const delegateVal = row[9];
      let couldDelegate: DelegateOpt = "no";
      if (delegateVal === "N/A") couldDelegate = "na";
      else if (delegateVal === "Yes") couldDelegate = "yes";

      const block: TimeBlock = {
        id: `${startHour}-${Date.now()}-${Math.random()}`,
        startHour,
        activity: row[4] ?? "",
        categories,
        energy: (row[6] as any) ?? "medium",
        wasPlanned: row[7] === "Yes",
        contributedToTopPriority,
        contributedPriority,
        contributedTargets,
        couldDelegate,
        satisfaction: parseInt(row[10] ?? "3", 10),
        contribution: row[11] ?? "",
        notes: row[12] ?? "",
        syncedAt: row[13] ?? null,
      };
      appData.days[date].blocks[startHour] = block;
    }

    return NextResponse.json({ ok: true, data: appData });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
