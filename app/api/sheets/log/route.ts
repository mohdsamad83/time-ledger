import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID, appendRows } from "@/lib/sheets-client";
import { TimeBlock, DEFAULT_CATEGORIES } from "@/lib/types";
import { format, parseISO } from "date-fns";

function toTime(h: number) {
  const p = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:00 ${p}`;
}

export async function POST(req: NextRequest) {
  try {
    const { date, block }: { date: string; block: TimeBlock } = await req.json();

    const dayName  = format(parseISO(date), "EEEE");
    const categoriesStr = block.categories ? block.categories.join(",") : (block.category || "deep-work");
    const syncedAt = new Date().toISOString();

    const row = [
      date,
      dayName,
      block.startHour,
      `${toTime(block.startHour)} – ${toTime(block.startHour + 1)}`,
      block.activity,
      categoriesStr,
      block.energy,
      block.wasPlanned ? "Yes" : "No",
      block.contributedTargets && block.contributedTargets.length > 0
        ? block.contributedTargets.map(t => `${t.name}:${t.percentage}%`).join(", ")
        : "No",
      block.couldDelegate === "na" ? "N/A" : block.couldDelegate === "yes" ? "Yes" : "No",
      block.satisfaction,
      block.contribution,
      block.notes,
      syncedAt,
    ];

    // Upsert: find existing row for date+hour combo
    const sheets = getSheetsClient();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: "📅 Time Log!A:D",
    });
    const rows = existing.data.values ?? [];
    const rowIdx = rows.findIndex(
      (r) => r[0] === date && Number(r[2]) === block.startHour
    );

    if (rowIdx > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `📅 Time Log!A${rowIdx + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    } else {
      await appendRows("📅 Time Log!A:N", row);
    }

    return NextResponse.json({ ok: true, syncedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
