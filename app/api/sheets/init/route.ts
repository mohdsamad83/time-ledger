import { NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";

const SHEETS_CONFIG = [
  {
    title: "📅 Time Log",
    headers: [
      "Date", "Day", "Hour", "Time Slot", "Activity", "Category", "Energy",
      "Planned?", "Top Priority?", "Delegate?", "Satisfaction (1–5)",
      "Contribution — What did I create/enable?", "Notes", "Synced At",
    ],
    color: { red: 0.08, green: 0.05, blue: 0.04 },
  },
  {
    title: "🌅 Day Setup",
    headers: [
      "Date", "Day", "Wake Time", "Sleep Target", "Top Priority",
      "Task 1", "Task 2", "Task 3", "Definition of a Great Day",
      "What NEEDS to be done? (Drucker)", "Synced At",
    ],
    color: { red: 0.04, green: 0.08, blue: 0.05 },
  },
  {
    title: "🌙 Evening Reviews",
    headers: [
      "Date", "Day", "Priority Accomplished?", "What I Actually Got Done",
      "Biggest Time Waste", "What to STOP Doing", "What to KEEP Doing",
      "Tomorrow's #1 Priority", "Day Rating (1–10)", "End-of-Day Energy",
      "Drucker Reflection — What contribution did I make?", "Synced At",
    ],
    color: { red: 0.04, green: 0.04, blue: 0.08 },
  },
  {
    title: "📊 Weekly Insights",
    headers: [
      "Week Starting", "Total Hours Logged",
      "Deep Work Hrs", "Meetings Hrs", "Admin Hrs", "Learning Hrs",
      "Health Hrs", "Personal Hrs", "Creative Hrs", "Strategic Hrs",
      "Fire-fighting Hrs", "Break Hrs",
      "Avg Satisfaction", "% Planned", "% Top Priority",
      "Avg Day Rating", "Priority Accomplished Days",
    ],
    color: { red: 0.05, green: 0.05, blue: 0.09 },
  },
  {
    title: "🎯 Targets",
    headers: ["Target Name", "Added At"],
    color: { red: 0.05, green: 0.08, blue: 0.09 },
  },
  {
    title: "✅ Daily Targets",
    headers: ["Date", "Completed Targets", "Synced At"],
    color: { red: 0.1, green: 0.8, blue: 0.1 },
  },
];

export async function POST() {
  try {
    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    // 1. Get existing sheets
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existing = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "");

    const requests: object[] = [];

    for (const cfg of SHEETS_CONFIG) {
      if (existing.includes(cfg.title)) continue;

      // Add sheet
      requests.push({
        addSheet: {
          properties: {
            title: cfg.title,
            gridProperties: { frozenRowCount: 1 },
            tabColor: cfg.color,
          },
        },
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests },
      });
    }

    // 2. Write headers to each sheet (idempotent)
    const headerData = await Promise.allSettled(
      SHEETS_CONFIG.map((cfg) =>
        sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${cfg.title}!A1:Z1`,
        })
      )
    );

    const writeRequests: object[] = [];
    for (let i = 0; i < SHEETS_CONFIG.length; i++) {
      const cfg = SHEETS_CONFIG[i];
      const result = headerData[i];
      const hasHeader =
        result.status === "fulfilled" &&
        (result.value.data.values ?? []).length > 0;

      if (!hasHeader) {
        // Write header row
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${cfg.title}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [cfg.headers] },
        });
      }
    }

    // 3. Bold + freeze header rows (best-effort, ignore errors)
    try {
      const freshMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const sheetMap: { [title: string]: number } = {};
      for (const s of freshMeta.data.sheets ?? []) {
        if (s.properties?.title && s.properties?.sheetId != null) {
          sheetMap[s.properties.title] = s.properties.sheetId;
        }
      }

      const formatRequests: object[] = [];
      for (const cfg of SHEETS_CONFIG) {
        const sid = sheetMap[cfg.title];
        if (sid == null) continue;
        formatRequests.push({
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                  fontSize: 11,
                  foregroundColorStyle: {
                    rgbColor: { red: 0.93, green: 0.89, blue: 0.80 },
                  },
                },
                backgroundColor: { red: 0.11, green: 0.09, blue: 0.06 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        });
        formatRequests.push({
          autoResizeDimensions: {
            dimensions: { sheetId: sid, dimension: "COLUMNS", startIndex: 0, endIndex: 14 },
          },
        });
      }
      if (formatRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests: formatRequests },
        });
      }
    } catch (_) {
      // non-fatal
    }

    return NextResponse.json({ ok: true, message: "Spreadsheet initialised" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
