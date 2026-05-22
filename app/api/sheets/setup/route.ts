import { NextRequest, NextResponse } from "next/server";
import { appendRows, getSheetsClient, SHEET_ID } from "@/lib/sheets-client";
import { DaySetup } from "@/lib/types";
import { format, parseISO } from "date-fns";

function toTime(h: number) {
  const period = h < 12 ? "AM" : "PM";
  const hr = h % 12 || 12;
  return `${hr}:00 ${period}`;
}

export async function POST(req: NextRequest) {
  try {
    const { date, setup }: { date: string; setup: DaySetup } = await req.json();

    const dayName = format(parseISO(date), "EEEE");
    const syncedAt = new Date().toISOString();

    const row = [
      date,
      dayName,
      toTime(setup.wakeHour),
      toTime(setup.sleepHour),
      setup.topPriority,
      setup.tasks[0] ?? "",
      setup.tasks[1] ?? "",
      setup.tasks[2] ?? "",
      setup.successDefinition,
      setup.druckerFocus,
      syncedAt,
    ];

    // Check if row for this date already exists
    const sheets = getSheetsClient();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: "🌅 Day Setup!A:A",
    });
    const rows = existing.data.values ?? [];
    const rowIdx = rows.findIndex((r) => r[0] === date);

    if (rowIdx > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `🌅 Day Setup!A${rowIdx + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    } else {
      await appendRows("🌅 Day Setup!A:K", row);
    }

    return NextResponse.json({ ok: true, syncedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
