import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID, appendRows } from "@/lib/sheets-client";
import { EveningReview } from "@/lib/types";
import { format, parseISO } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { date, review }: { date: string; review: EveningReview } = await req.json();

    const dayName  = format(parseISO(date), "EEEE");
    const syncedAt = new Date().toISOString();

    const row = [
      date,
      dayName,
      review.topPriorityAccomplished ? "✅ Yes" : "❌ No",
      review.accomplishments,
      review.biggestWaste,
      review.stopDoing,
      review.keepDoing,
      review.tomorrowPriority,
      review.overallRating,
      review.energyEnd,
      review.druckerContribution,
      syncedAt,
    ];

    const sheets = getSheetsClient();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: "🌙 Evening Reviews!A:A",
    });
    const rows = existing.data.values ?? [];
    const rowIdx = rows.findIndex((r) => r[0] === date);

    if (rowIdx > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `🌙 Evening Reviews!A${rowIdx + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    } else {
      await appendRows("🌙 Evening Reviews!A:L", row);
    }

    return NextResponse.json({ ok: true, syncedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
