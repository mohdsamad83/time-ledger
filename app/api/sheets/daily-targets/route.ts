import { NextRequest, NextResponse } from "next/server";
import { appendRows, getSheetsClient, SHEET_ID } from "@/lib/sheets-client";

export async function POST(req: NextRequest) {
  try {
    const { date, targets }: { date: string; targets: string[] } = await req.json();

    const syncedAt = new Date().toISOString();
    const completedStr = targets.join(", ");

    const row = [
      date,
      completedStr,
      syncedAt,
    ];

    const sheets = getSheetsClient();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: "✅ Daily Targets!A:A",
    });
    const rows = existing.data.values ?? [];
    const rowIdx = rows.findIndex((r) => r[0] === date);

    if (rowIdx > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `✅ Daily Targets!A${rowIdx + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    } else {
      await appendRows("✅ Daily Targets!A:C", row);
    }

    return NextResponse.json({ ok: true, syncedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
